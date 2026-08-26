package com.safekeyboard.ime

import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import com.safekeyboard.R
import com.safekeyboard.nlp.ToxicityAnalyzer
import com.safekeyboard.nlp.EnhancedToxicityAnalyzer
import com.safekeyboard.ui.WarningOverlayManager
import com.safekeyboard.utils.PreferencesManager
import com.safekeyboard.network.ViolationLogger
import kotlinx.coroutines.*

/**
 * SafeKeyboardIME - Core keyboard service implementing pre-send harm prevention
 *
 * This Input Method Editor (IME):
 * - Captures all user input in a message buffer
 * - Detects intent-to-send through multiple signals
 * - Analyzes message toxicity on-device
 * - Shows intervention popup before harmful messages are sent
 * - Logs metadata only (never message content)
 */
class SafeKeyboardIME : InputMethodService(), KeyboardView.OnKeyboardActionListener {

    private var keyboardView: KeyboardView? = null
    private var keyboard: Keyboard? = null
    private var suggestionStrip: SuggestionStripView? = null

    // Long-press handling for top-row digits (Q..P => 1..0) and backspace repeat.
    private val pressHandler = Handler(Looper.getMainLooper())
    private var pendingLongPress: Runnable? = null
    private var longPressConsumed = false
    private var backspaceRepeat: Runnable? = null

    // Map top-row letter codes -> digit char.
    private val topRowDigits: Map<Int, Char> = mapOf(
        113 to '1', 119 to '2', 101 to '3', 114 to '4', 116 to '5',
        121 to '6', 117 to '7', 105 to '8', 111 to '9', 112 to '0'
    )

    // Message buffer - NEVER persisted
    private val messageBuffer = MessageBuffer()

    // Intent-to-send detector
    private val sendIntentDetector = SendIntentDetector()

    // On-device NLP analyzer (enhanced with shared library)
    private lateinit var enhancedAnalyzer: EnhancedToxicityAnalyzer

    // Warning overlay manager
    private lateinit var overlayManager: WarningOverlayManager

    // Preferences
    private lateinit var preferencesManager: PreferencesManager

    // Violation logger (for server communication)
    private lateinit var violationLogger: ViolationLogger

    // Coroutine scope for async operations
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // State tracking
    private var isShiftOn = false
    private var lastKeyPressTime = 0L
    private var currentAppPackage = ""

    // --- Fig 3 telemetry state ---------------------------------------------
    // Stash of the analysis result that triggered the currently-visible
    // warning overlay. Retained beyond `overlayManager.currentAnalysisResult`
    // so we can still log action="cancelled" after the overlay is torn down
    // by the system (onFinishInputView / onDestroy).
    private var pendingWarningCategory: String? = null
    private var pendingWarningSeverity: String? = null

    // Guard against double-logging: set true as soon as we log any terminal
    // action for the current warning (edited / sent_anyway / cancelled).
    private var warningDecisionMade = true

    // Simple in-process counters for on-device verification of the
    // Edited vs Sent Unchanged ratio during device testing. Dumped to
    // logcat at verbose level after every action.
    private data class TelemetryCounts(
        var edited: Int = 0,
        var sentAnyway: Int = 0,
        var cancelled: Int = 0,
        var blocked: Int = 0
    )
    private val telemetryCounts = TelemetryCounts()

    private fun logTelemetryCounts(justLogged: String) {
        Log.v(
            TAG,
            "TelemetryCounts action=$justLogged " +
                "edited=${telemetryCounts.edited} " +
                "sent_anyway=${telemetryCounts.sentAnyway} " +
                "cancelled=${telemetryCounts.cancelled} " +
                "blocked=${telemetryCounts.blocked}"
        )
    }

    // --- Live (debounced) analysis while typing ---------------------------
    // WhatsApp / IG / most messengers use their OWN Send button (outside the
    // keyboard), so KEYCODE_DONE never fires and handleDone()'s pre-send
    // analysis is skipped. To still catch harmful content in those apps, we
    // run a debounced analysis on the buffer as the user types. Fires the
    // Fig 2 warning overlay as soon as the RF classifier score >= 0.5.
    private val liveDebounceHandler = Handler(Looper.getMainLooper())
    private var pendingLiveAnalysis: Runnable? = null
    private val LIVE_ANALYSIS_DEBOUNCE_MS = 800L
    private var lastLiveAnalyzedText: String = ""

    companion object {
        private const val TAG = "SafeKeyboardIME"
        private const val MIN_CHARS_FOR_LIVE = 10
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize components
        enhancedAnalyzer = EnhancedToxicityAnalyzer(this)
        overlayManager = WarningOverlayManager(this)
        preferencesManager = PreferencesManager(this)
        violationLogger = ViolationLogger(this)

        // Set up warning popup callback
        overlayManager.onUserDecision = { sendAnyway ->
            if (sendAnyway) {
                handleSendAnywayChoice()
            } else {
                handleEditChoice()
            }
        }

        // If the overlay is torn down without the user tapping Edit or
        // Continue (IME finished, service destroyed, tap outside), treat it
        // as a cancellation so the Fig 3 donut denominator stays correct.
        overlayManager.onDismissedWithoutDecision = {
            handleOverlayCancelled()
        }
    }

    override fun onCreateInputView(): View {
        val root = layoutInflater.inflate(R.layout.keyboard_view, null)
        keyboardView = root.findViewById(R.id.keyboard_view)
        suggestionStrip = root.findViewById(R.id.suggestion_strip)
        keyboard = Keyboard(this, R.xml.qwerty)
        keyboardView?.keyboard = keyboard
        keyboardView?.setOnKeyboardActionListener(this)

        // Tap suggestion -> replace current partial word via InputConnection.
        suggestionStrip?.onSuggestionTapped = { word ->
            replaceCurrentWord(word)
        }
        return root
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)

        // Clear buffer when starting new input
        if (!restarting) {
            messageBuffer.clear()
        }

        // Track current app context
        attribute?.packageName?.let {
            currentAppPackage = it
        }

        // Update send intent detector with app context
        sendIntentDetector.updateAppContext(currentAppPackage)
    }

    /**
     * Last-chance intervention hook (paper Fig 2).
     *
     * When the editor loses focus (user is switching away — often right after tapping Send),
     * run one final synchronous analysis on the current buffer. If risk >= 0.5 and no
     * overlay is already showing, surface the warning overlay before it's too late.
     *
     * Buffer is always cleared after handling so nothing leaks across editors.
     */
    override fun onFinishInput() {
        super.onFinishInput()
        try {
            if (preferencesManager.isModerationEnabled() &&
                !messageBuffer.isEmpty() &&
                !overlayManager.isOverlayShowing()
            ) {
                val message = messageBuffer.getCurrentMessage()
                if (message.isNotEmpty()) {
                    val platform = getPlatformFromPackage(currentAppPackage)
                    val result = enhancedAnalyzer.analyzeMessage(
                        message = message,
                        sensitivity = preferencesManager.getSensitivityThreshold().toDouble(),
                        platform = platform
                    )
                    if (result.toxicityScore >= 0.5f) {
                        showWarningPopup(result)
                    }
                }
            }
        } catch (e: Exception) {
            // Fail open — never block the user because of an analysis error.
            e.printStackTrace()
        } finally {
            messageBuffer.clear()
        }
    }

    override fun onUpdateSelection(
        oldSelStart: Int, oldSelEnd: Int,
        newSelStart: Int, newSelEnd: Int,
        candidatesStart: Int, candidatesEnd: Int
    ) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd)

        // Detect cursor movement away from end (signal of message finalization)
        val currentText = getCurrentInputConnection()?.getTextBeforeCursor(500, 0)?.toString() ?: ""
        if (newSelStart != currentText.length) {
            sendIntentDetector.recordCursorMoveAway()
        }
    }

    // KeyboardView.OnKeyboardActionListener methods

    override fun onKey(primaryCode: Int, keyCodes: IntArray?) {
        val inputConnection = currentInputConnection ?: return

        // If a long-press handler already committed a digit / repeat-deleted
        // for this key press, swallow the normal onKey.
        if (longPressConsumed) {
            longPressConsumed = false
            return
        }

        when (primaryCode) {
            Keyboard.KEYCODE_DELETE -> handleBackspace(inputConnection)
            Keyboard.KEYCODE_SHIFT -> handleShift()
            Keyboard.KEYCODE_DONE -> handleDone(inputConnection)
            Keyboard.KEYCODE_MODE_CHANGE -> handleModeChange()
            else -> handleCharacter(primaryCode, inputConnection)
        }

        // Update last key press time for pause detection
        lastKeyPressTime = System.currentTimeMillis()

        // Refresh the suggestion strip after any character-affecting key.
        refreshSuggestions()
    }

    override fun onPress(primaryCode: Int) {
        // Cancel any pending timers from a previous key.
        cancelPendingTimers()
        longPressConsumed = false

        when {
            // Top-row letters: schedule digit-insert after 300ms.
            topRowDigits.containsKey(primaryCode) -> {
                val digit = topRowDigits.getValue(primaryCode)
                pendingLongPress = Runnable {
                    val ic = currentInputConnection ?: return@Runnable
                    ic.commitText(digit.toString(), 1)
                    messageBuffer.append(digit.toString())
                    longPressConsumed = true
                    lastKeyPressTime = System.currentTimeMillis()
                    refreshSuggestions()
                    vibrate(30)
                    scheduleLiveAnalysis()
                }
                pressHandler.postDelayed(pendingLongPress!!, 300)
            }
            // Backspace: schedule accelerating repeat.
            primaryCode == Keyboard.KEYCODE_DELETE -> {
                scheduleBackspaceAcceleration()
            }
        }
    }

    override fun onRelease(primaryCode: Int) {
        cancelPendingTimers()
    }

    override fun onText(text: CharSequence?) {
        // Handle text input
        text?.let {
            currentInputConnection?.commitText(it, 1)
            messageBuffer.append(it.toString())
            scheduleLiveAnalysis()
        }
    }

    override fun swipeLeft() {}
    override fun swipeRight() {}
    override fun swipeDown() {}
    override fun swipeUp() {}

    // Input handling methods

    private fun handleCharacter(code: Int, ic: InputConnection) {
        var char = code.toChar()

        if (isShiftOn) {
            char = char.uppercaseChar()
            isShiftOn = false
        }

        // Commit character
        ic.commitText(char.toString(), 1)

        // Add to message buffer
        messageBuffer.append(char.toString())

        // Check for send intent periodically
        checkSendIntentAsync()

        // Debounced live analysis (catches WhatsApp-style external Send).
        scheduleLiveAnalysis()
    }

    private fun handleBackspace(ic: InputConnection) {
        // Delete character before cursor
        ic.deleteSurroundingText(1, 0)

        // Remove from buffer
        messageBuffer.deleteLastChar()
    }

    private fun handleShift() {
        isShiftOn = !isShiftOn
        keyboard?.isShifted = isShiftOn
        keyboardView?.invalidateAllKeys()
    }

    private fun handleDone(ic: InputConnection) {
        // Enter key pressed - strong signal of intent to send
        sendIntentDetector.recordEnterKeyPress()

        // Paper Algorithm 1, step 1: immediate synchronous analysis on Enter/Send
        // in a social/communication context. If risky, consume the key event and
        // show the warning overlay. Only proceed with send if the user taps Continue.
        if (preferencesManager.isModerationEnabled() &&
            sendIntentDetector.isSocialCommunicationApp() &&
            !overlayManager.isOverlayShowing()
        ) {
            val message = messageBuffer.getCurrentMessage()
            if (message.isNotEmpty()) {
                try {
                    val result = enhancedAnalyzer.analyzeMessage(
                        message = message,
                        sensitivity = preferencesManager.getSensitivityThreshold().toDouble(),
                        platform = getPlatformFromPackage(currentAppPackage)
                    )
                    if (result.toxicityScore >= 0.5f) {
                        // Consume the Enter key: do NOT forward to the host app.
                        showWarningPopup(result)
                        return
                    }
                } catch (e: Exception) {
                    // Fail open
                    e.printStackTrace()
                }
            }
        }

        ic.sendKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER))
        ic.sendKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_ENTER))

        // Immediate send intent check (async delayed-pause path, kept for parity)
        checkSendIntentAsync()
    }

    private fun handleModeChange() {
        // Switch between alphabetic and numeric keyboards (future enhancement)
    }

    // -----------------------------------------------------------------------
    // Suggestion strip wiring
    // -----------------------------------------------------------------------

    private fun currentPartialWord(): String {
        val ic = currentInputConnection ?: return ""
        val before = ic.getTextBeforeCursor(64, 0)?.toString() ?: return ""
        // Take the trailing run of letters (partial word).
        val sb = StringBuilder()
        for (i in before.length - 1 downTo 0) {
            val c = before[i]
            if (c.isLetter()) sb.append(c) else break
        }
        return sb.reverse().toString()
    }

    private fun refreshSuggestions() {
        suggestionStrip?.updateForPrefix(currentPartialWord())
    }

    private fun replaceCurrentWord(word: String) {
        val ic = currentInputConnection ?: return
        val partial = currentPartialWord()
        ic.beginBatchEdit()
        try {
            if (partial.isNotEmpty()) {
                ic.deleteSurroundingText(partial.length, 0)
                // Sync buffer.
                repeat(partial.length) { messageBuffer.deleteLastChar() }
            }
            val out = word + " "
            ic.commitText(out, 1)
            messageBuffer.append(out)
        } finally {
            ic.endBatchEdit()
        }
        refreshSuggestions()
        scheduleLiveAnalysis()
    }

    // -----------------------------------------------------------------------
    // Backspace acceleration + long-press timers
    // -----------------------------------------------------------------------

    private fun cancelPendingTimers() {
        pendingLongPress?.let { pressHandler.removeCallbacks(it) }
        pendingLongPress = null
        backspaceRepeat?.let { pressHandler.removeCallbacks(it) }
        backspaceRepeat = null
    }

    /**
     * Backspace hold behavior:
     *   0..500ms  : single tap only (handled by onKey)
     *   500ms+    : 1 char / 40ms
     *   2000ms+   : whole word at a time (every 120ms)
     * Vibrates 30ms on each threshold change.
     */
    private fun scheduleBackspaceAcceleration() {
        val startTime = System.currentTimeMillis()
        var stage = 0 // 0=idle, 1=char-repeat, 2=word-repeat
        val runnable = object : Runnable {
            override fun run() {
                val ic = currentInputConnection ?: return
                val elapsed = System.currentTimeMillis() - startTime
                val newStage = when {
                    elapsed >= 2000 -> 2
                    elapsed >= 500 -> 1
                    else -> 0
                }
                if (newStage != stage) {
                    stage = newStage
                    if (stage > 0) vibrate(30)
                }
                when (stage) {
                    1 -> {
                        ic.deleteSurroundingText(1, 0)
                        messageBuffer.deleteLastChar()
                        refreshSuggestions()
                        pressHandler.postDelayed(this, 40)
                    }
                    2 -> {
                        deletePrecedingWord(ic)
                        refreshSuggestions()
                        pressHandler.postDelayed(this, 120)
                    }
                    else -> {
                        // Not yet at threshold — check again shortly.
                        pressHandler.postDelayed(this, 60)
                    }
                }
            }
        }
        backspaceRepeat = runnable
        // First check after 500ms (initial single tap is handled separately by onKey).
        pressHandler.postDelayed(runnable, 500)
    }

    private fun deletePrecedingWord(ic: InputConnection) {
        val before = ic.getTextBeforeCursor(64, 0)?.toString() ?: return
        if (before.isEmpty()) return
        // Trim one trailing whitespace, then all trailing non-whitespace.
        var i = before.length
        while (i > 0 && before[i - 1].isWhitespace()) i--
        while (i > 0 && !before[i - 1].isWhitespace()) i--
        val deleteCount = before.length - i
        if (deleteCount > 0) {
            ic.deleteSurroundingText(deleteCount, 0)
            repeat(deleteCount) { messageBuffer.deleteLastChar() }
        }
    }

    private fun vibrate(ms: Long) {
        try {
            val v = getSystemService(VIBRATOR_SERVICE) as? Vibrator ?: return
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION") v.vibrate(ms)
            }
        } catch (_: Exception) { /* haptics are best-effort */ }
    }

    /**
     * Checks if user is about to send the message
     * If yes, analyzes the message and shows warning if needed
     */
    private fun checkSendIntentAsync() {
        if (!preferencesManager.isModerationEnabled()) {
            return
        }

        serviceScope.launch {
            // Check typing pause
            delay(1500) // Wait for pause threshold

            val timeSinceLastKey = System.currentTimeMillis() - lastKeyPressTime
            if (timeSinceLastKey >= 1500) {
                sendIntentDetector.recordTypingPause()
            }

            // Determine if user is about to send
            if (sendIntentDetector.isUserAboutToSend()) {
                val message = messageBuffer.getCurrentMessage()

                if (message.isNotEmpty()) {
                    // ONLY analyze in social/gaming/communication contexts
                    // NOT in productivity apps (Google Docs, Word, Notes, Search)
                    if (sendIntentDetector.isSocialCommunicationApp()) {
                        analyzeAndIntervene(message)
                    }
                }
            }
        }
    }

    /**
     * Analyzes message toxicity and shows warning if needed
     * Now uses enhanced detection with 90-95% accuracy
     */
    private suspend fun analyzeAndIntervene(message: String) = withContext(Dispatchers.Default) {
        try {
            // Get platform context for context-aware detection
            val platform = getPlatformFromPackage(currentAppPackage)

            // Use enhanced analyzer with all improvements
            val result = enhancedAnalyzer.analyzeMessage(
                message = message,
                sensitivity = preferencesManager.getSensitivityThreshold().toDouble(),
                platform = platform
            )

            // Check if message is problematic
            if (result.isToxic) {
                withContext(Dispatchers.Main) {
                    showWarningPopup(result)
                }
            }
        } catch (e: Exception) {
            // Fail open - if analysis fails, allow the message
            e.printStackTrace()
        }
    }

    /**
     * Map Android package name to platform hostname for context detection
     */
    private fun getPlatformFromPackage(packageName: String): String {
        return when {
            packageName.contains("instagram") -> "instagram.com"
            packageName.contains("twitter") || packageName.contains("x.corp") -> "x.com"
            packageName.contains("discord") -> "discord.com"
            packageName.contains("whatsapp") -> "whatsapp.com"
            packageName.contains("facebook") || packageName.contains("messenger") -> "facebook.com"
            packageName.contains("reddit") -> "reddit.com"
            packageName.contains("youtube") -> "youtube.com"
            packageName.contains("tiktok") -> "tiktok.com"
            packageName.contains("snapchat") -> "snapchat.com"
            packageName.contains("telegram") -> "telegram.org"
            packageName.contains("linkedin") -> "linkedin.com"
            packageName.contains("github") -> "github.com"
            else -> ""
        }
    }

    /**
     * Debounced live analysis while typing (Fig 2 trigger for messengers
     * that use their own Send button — WhatsApp, Instagram, etc.).
     *
     * Every printable-char insert calls this. We cancel any pending run and
     * post a new one 800ms later. Once fired, we hop off the UI thread for
     * the (potentially expensive) RF classifier call, then hop back to show
     * the warning overlay if score >= 0.5.
     */
    private fun scheduleLiveAnalysis() {
        if (!preferencesManager.isModerationEnabled()) return

        // Cancel any pending analysis — user is still typing.
        pendingLiveAnalysis?.let { liveDebounceHandler.removeCallbacks(it) }

        val runnable = Runnable {
            val text = messageBuffer.getCurrentMessage()

            if (text.length < MIN_CHARS_FOR_LIVE) {
                Log.w(TAG, "Live analyze skipped: too_short len=${text.length}")
                return@Runnable
            }
            if (text == lastLiveAnalyzedText) {
                Log.w(TAG, "Live analyze skipped: unchanged len=${text.length}")
                return@Runnable
            }
            if (overlayManager.isOverlayShowing()) {
                Log.w(TAG, "Live analyze skipped: overlay_already_showing")
                return@Runnable
            }

            lastLiveAnalyzedText = text

            // Off UI thread for classifier, then back on for overlay.
            serviceScope.launch(Dispatchers.Default) {
                try {
                    val result = enhancedAnalyzer.analyzeMessage(
                        message = text,
                        sensitivity = preferencesManager.getSensitivityThreshold().toDouble(),
                        platform = getPlatformFromPackage(currentAppPackage)
                    )
                    Log.d(TAG, "Live analyzed len=${text.length} score=${result.toxicityScore}")
                    if (result.toxicityScore >= 0.5f) {
                        withContext(Dispatchers.Main) {
                            if (!overlayManager.isOverlayShowing()) {
                                showWarningPopup(result)
                            } else {
                                Log.w(TAG, "Live analyze skipped: overlay_shown_during_analysis")
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Fail open.
                    e.printStackTrace()
                }
            }
        }
        pendingLiveAnalysis = runnable
        liveDebounceHandler.postDelayed(runnable, LIVE_ANALYSIS_DEBOUNCE_MS)
        Log.d(TAG, "Live scheduled for buffer len=${messageBuffer.getCurrentMessage().length}")
    }

    /**
     * Shows the intervention popup
     */
    private fun showWarningPopup(result: EnhancedToxicityAnalyzer.AnalysisResult) {
        overlayManager.showWarning(
            category = result.category,
            severity = result.severity
        )

        // Stash the triggering analysis so we can attribute a terminal action
        // (edited / sent_anyway / cancelled) to the right category+severity
        // even if the overlay is dismissed by the system before the user taps.
        pendingWarningCategory = result.category
        pendingWarningSeverity = result.severity
        warningDecisionMade = false

        // Store current analysis result for logging (convert to old format for compatibility)
        val legacyResult = ToxicityAnalyzer.AnalysisResult(
            toxicityScore = result.toxicityScore,
            category = result.category,
            severity = result.severity
        )
        overlayManager.currentAnalysisResult = legacyResult
    }

    /**
     * User chose to send anyway - log violation
     */
    private fun handleSendAnywayChoice() {
        val result = overlayManager.currentAnalysisResult ?: return
        if (warningDecisionMade) return
        warningDecisionMade = true

        // Log violation metadata (NO message content)
        serviceScope.launch {
            try {
                violationLogger.logViolation(
                    category = result.category,
                    severity = result.severity,
                    action = "sent_anyway"
                )
            } catch (e: Exception) {
                // Fail silently - don't block user
                e.printStackTrace()
            }
        }

        telemetryCounts.sentAnyway += 1
        logTelemetryCounts("sent_anyway")

        // Clear pending stash
        pendingWarningCategory = null
        pendingWarningSeverity = null

        // Clear buffer after send
        messageBuffer.clear()

        // Reset send intent detector
        sendIntentDetector.reset()

        // Allow live analysis to re-fire on the next batch of typing.
        lastLiveAnalyzedText = ""
    }

    /**
     * User chose to edit - dismiss and allow editing.
     * Logs action="edited" so Fig 3 can compare heeded vs ignored warnings.
     */
    private fun handleEditChoice() {
        if (!warningDecisionMade) {
            warningDecisionMade = true

            val category = pendingWarningCategory
                ?: overlayManager.currentAnalysisResult?.category
            val severity = pendingWarningSeverity
                ?: overlayManager.currentAnalysisResult?.severity

            if (category != null && severity != null) {
                serviceScope.launch {
                    try {
                        violationLogger.logViolation(
                            category = category,
                            severity = severity,
                            action = "edited"
                        )
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                telemetryCounts.edited += 1
                logTelemetryCounts("edited")
            }
        }

        pendingWarningCategory = null
        pendingWarningSeverity = null

        // Buffer remains intact; user can continue editing.
        // Reset send intent detector.
        sendIntentDetector.reset()

        // Allow live analysis to re-fire if user keeps typing after editing.
        lastLiveAnalyzedText = ""
    }

    /**
     * Overlay was dismissed by the system without an explicit user decision
     * (e.g. IME finished, service destroyed, tap outside). Log once as
     * action="cancelled" so the Fig 3 donut denominator stays accurate.
     */
    private fun handleOverlayCancelled() {
        if (warningDecisionMade) return
        warningDecisionMade = true

        val category = pendingWarningCategory
            ?: overlayManager.currentAnalysisResult?.category
        val severity = pendingWarningSeverity
            ?: overlayManager.currentAnalysisResult?.severity

        if (category != null && severity != null) {
            serviceScope.launch {
                try {
                    violationLogger.logViolation(
                        category = category,
                        severity = severity,
                        action = "cancelled"
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            telemetryCounts.cancelled += 1
            logTelemetryCounts("cancelled")
        }

        pendingWarningCategory = null
        pendingWarningSeverity = null

        // Allow live analysis to re-fire on new typing after cancellation.
        lastLiveAnalyzedText = ""
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        // If the overlay was showing and no decision was made, this counts
        // as a cancellation. WarningOverlayManager.cleanup() will fire the
        // onDismissedWithoutDecision callback; we mirror that here in case
        // the view is torn down without cleanup() (safety net; guarded by
        // warningDecisionMade so we don't double-log).
        if (overlayManager.isOverlayShowing() && !warningDecisionMade) {
            handleOverlayCancelled()
        }
        super.onFinishInputView(finishingInput)
    }

    override fun onDestroy() {
        // Ensure a hanging warning gets a cancelled log before teardown.
        if (overlayManager.isOverlayShowing() && !warningDecisionMade) {
            handleOverlayCancelled()
        }
        super.onDestroy()
        serviceScope.cancel()
        cancelPendingTimers()
        pendingLiveAnalysis?.let { liveDebounceHandler.removeCallbacks(it) }
        pendingLiveAnalysis = null
        overlayManager.cleanup()
        enhancedAnalyzer.destroy()
    }
}
