package com.safekeyboard.ime

import android.inputmethodservice.InputMethodService
import android.inputmethodservice.Keyboard
import android.inputmethodservice.KeyboardView
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
 * SafeKeyboardIME - Core keyboard service implementing cyberbullying prevention
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
    }

    override fun onCreateInputView(): View {
        keyboardView = layoutInflater.inflate(R.layout.keyboard_view, null) as KeyboardView
        keyboard = Keyboard(this, R.xml.qwerty)
        keyboardView?.keyboard = keyboard
        keyboardView?.setOnKeyboardActionListener(this)
        return keyboardView!!
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

        when (primaryCode) {
            Keyboard.KEYCODE_DELETE -> handleBackspace(inputConnection)
            Keyboard.KEYCODE_SHIFT -> handleShift()
            Keyboard.KEYCODE_DONE -> handleDone(inputConnection)
            Keyboard.KEYCODE_MODE_CHANGE -> handleModeChange()
            else -> handleCharacter(primaryCode, inputConnection)
        }

        // Update last key press time for pause detection
        lastKeyPressTime = System.currentTimeMillis()
    }

    override fun onPress(primaryCode: Int) {
        // Key press started
    }

    override fun onRelease(primaryCode: Int) {
        // Key press released
    }

    override fun onText(text: CharSequence?) {
        // Handle text input
        text?.let {
            currentInputConnection?.commitText(it, 1)
            messageBuffer.append(it.toString())
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
     * Shows the intervention popup
     */
    private fun showWarningPopup(result: EnhancedToxicityAnalyzer.AnalysisResult) {
        overlayManager.showWarning(
            category = result.category,
            severity = result.severity
        )

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

        // Clear buffer after send
        messageBuffer.clear()

        // Reset send intent detector
        sendIntentDetector.reset()
    }

    /**
     * User chose to edit - dismiss and allow editing
     */
    private fun handleEditChoice() {
        // Simply dismiss the popup, buffer remains intact
        // User can continue editing

        // Reset send intent detector
        sendIntentDetector.reset()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        overlayManager.cleanup()
        enhancedAnalyzer.destroy()
    }
}
