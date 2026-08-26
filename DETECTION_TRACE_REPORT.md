# SendWise Detection Trace Report

**HEAD:** baefe7f (or later). Read-only investigation.
**Symptom:** Typing overtly abusive text produces zero warnings and zero dashboard incidents in every app.

---

## 1. Root cause

**`WebViewBridge` never actually executes the JS detection library. Every call returns `score=0.0`, and the lexicon-based fallback is unreachable after startup.**

Evidence chain:

- **`WebViewBridge.java:62–67`** loads each JS module with `webView.loadUrl("file:///android_asset/detection-library/analyzer.js")`. Calling `loadUrl` on a bare `.js` file does NOT execute it as script in a shared page context — the WebView navigates to that URL as a *document*, and each subsequent `loadUrl` **replaces the previous page**, discarding any globals it may have created. There is no HTML host page, no `<script src>` chain, no shared `window`.
- **`analyzer.js:3`** declares `const ToxicityAnalyzer = {…}` at top level (same pattern in the other modules). Even if a single `loadUrl` on a `.js` file did try to execute it (some Android WebView builds do), `const` binds to the module scope, never to `window`/`self`, so `index.js`'s browser branch (`self.ToxicityAnalyzer || window.ToxicityAnalyzer`, index.js:48–52) always resolves to `undefined`.
- Net result: `SafeKeyboardDetection` global is never defined. When `WebViewBridge.analyzeText` runs the injected IIFE (WebViewBridge.java:107–125), it hits a `ReferenceError` and the JS `catch` returns:
  ```json
  {"isToxic":false,"score":0.0,"category":"none","severity":"none","error":"..."}
  ```
  Note there is **no `fallback:true` flag** — this is the JS-level catch, not `getFallbackResult()`.
- **`EnhancedToxicityAnalyzer.kt:89–104`** only checks `optBoolean("fallback", false)`. Since that flag is absent, `parseEnhancedResult` accepts the payload and returns `AnalysisResult(toxicityScore=0f, category="none", severity="none", isToxic=false)`.
- **`EnhancedToxicityAnalyzer.kt:73`** gates on `webViewBridge.isReady()`. `isReady()` returns `isInitialized`, which is flipped to `true` unconditionally 500 ms after service start (`WebViewBridge.java:70–73`) — regardless of whether the scripts actually loaded. So `useFallbackAnalyzer()` (which invokes the working lexicon `ToxicityAnalyzer` and WOULD flag "stupid"/"idiot") is called only during the first 500 ms of the IME's lifetime, before any user has typed 25 chars / 4 words.

Result: every live-analysis run for every keystroke produces score `0.0` and `isToxic=false`. `scheduleLiveAnalysis` reaches its debounced runnable, runs the analyzer, sees `result.toxicityScore >= 0.5f` as `false`, and returns silently. **No overlay is ever shown, no incident is ever logged.** This explains the exact symptom: not "no code path fires" — the path fires perfectly, and the analyzer confidently reports "clean" for everything.

---

## 2. Secondary contributors

1. **`handleDone` is dead in Instagram/Google Search.** `SafeKeyboardIME.kt:499` requires `sendIntentDetector.isSocialCommunicationApp()`, which returns true only if the package is in `chatAppPackages` (SendIntentDetector.kt:37–96). "Google Search" (`com.google.android.googlequicksearchbox`) is **not** in that set, so even a functioning analyzer would never intervene there via the Send path. Instagram (`com.instagram.android`) *is* in the set, but Instagram's Send button never fires KEYCODE_DONE anyway — it triggers `onFinishInput`, which correctly runs analysis at IME teardown but by then the message has already gone.
2. **`onFinishInput` race with overlay.** SafeKeyboardIME.kt:316–347 clears the buffer in a `finally` block AFTER calling `showWarningPopup`. If the overlay does render (once #1 is fixed), the buffer wipes immediately and any subsequent Edit/Cancel telemetry loses category context except via `pendingWarningCategory` (which is set, so this survives — but only barely).
3. **`RandomForestTextClassifier` is completely unwired.** The trained model `assets/models/sendwise_rf_v1.json.gz` exists but no code path calls `RandomForestTextClassifier.load(...)`. The class compiles, the model ships in the APK, and no one ever loads it. Dead code / dead asset.
4. **`isSensitiveInputField` treats Instagram search bars as sensitive.** Not the current cause, but note: Instagram DM composer uses `TYPE_CLASS_TEXT` (fine). MIUI/Xiaomi Mint keyboard search bars can carry `TYPE_TEXT_VARIATION_URI` (line 209) — some search fields get classed as `email/phone/uri` and analysis is disabled. Watch for this on Google app.
5. **`onText(...)` (SafeKeyboardIME.kt:425–434) bypasses the sensitive-field check on the commit but honors it on the buffer.** Correct behavior, but note the commit still happens — good.
6. **Debounce cancellation on every keystroke.** `scheduleLiveAnalysis` (line 756) cancels the pending runnable on every char. If the user types at ≥1 char/second continuously, live analysis literally never fires until they pause 1 second. On mobile flow-typing this is common and would delay/skip detection even if the analyzer worked.
7. **`fallback:true` semantics mismatch.** Two different "fallback" concepts: `WebViewBridge.getFallbackResult()` sets `fallback:true` (only used when `!isInitialized`), but the JS-level `catch` (WebViewBridge.java:113–120) does not. This is the exact hole the root cause fell through. Regardless of #1 fix, this parse should be defensive.

---

## 3. Trace of a hypothetical keystroke ("a" typed as the 39th char in Instagram DM)

| Step | File:Line | What happens |
|---|---|---|
| 1 | IME.kt:365 `onKey(97, …)` | primaryCode='a', not DONE/DEL/SHIFT |
| 2 | IME.kt:443 `handleCharacter` | `ic.commitText("a",1)`, `analysisEnabledForField=true` → `messageBuffer.append("a")`, `lastCommittedChar='a'` |
| 3 | IME.kt:465 `checkSendIntentAsync` | Launched, but `isUserAboutToSend()` = false (no Enter, no cursor move) → no-op |
| 4 | IME.kt:468 `scheduleLiveAnalysis` | Cancel prior runnable, post new one, delay=1000ms (not a space) |
| 5 | IME.kt:387 `refreshSuggestions` | Updates strip |
| 6 | (1000ms later, if user paused) IME.kt:758 runnable | `text.length=39 >= 25`, `wordCount=6 >= 4`, `text != lastLiveAnalyzedText`, no overlay → proceeds |
| 7 | IME.kt:778 `serviceScope.launch(Dispatchers.Default)` | Off-thread |
| 8 | IME.kt:780 `enhancedAnalyzer.analyzeMessage(...)` | Enters `EnhancedToxicityAnalyzer.analyzeMessage` |
| 9 | EnhancedToxicityAnalyzer.kt:73 `webViewBridge.isReady()` | **true** (service is >500ms old) |
| 10 | WebViewBridge.java:96 `analyzeText` | Builds JS IIFE calling `SafeKeyboardDetection.analyze(...)` |
| 11 | WebViewBridge.java:131 `evaluateJavascript` | JS runs: `SafeKeyboardDetection` is `undefined` → ReferenceError → catch returns `{"isToxic":false,"score":0.0,"category":"none","severity":"none","error":"ReferenceError: SafeKeyboardDetection is not defined"}` |
| 12 | EnhancedToxicityAnalyzer.kt:94 | `optBoolean("fallback")` = **false** (the JS catch didn't set it). Parse continues. |
| 13 | EnhancedToxicityAnalyzer.kt:118 | Returns `AnalysisResult(toxicityScore=0.0f, category="none", severity="none", isToxic=false)` |
| 14 | IME.kt:786 | `result.toxicityScore >= 0.5f` → **false** |
| 15 | Nothing happens. Logcat line 785 shows: `Live analyzed len=39 score=0.0` — the smoking gun. |

---

## 4. Fix recommendation

Two-part minimal fix. Part A is required; Part B is strongly recommended defense-in-depth.

### Part A — Bypass the broken WebView bridge, use the lexicon fallback for now

The lexicon `ToxicityAnalyzer` already correctly flags the test string ("stupid" + "idiot" → score ≈ 0.67, isToxic=true). Wire `EnhancedToxicityAnalyzer` to prefer it until the WebView pipeline is repaired.

```diff
--- a/SafeKeyboardApp/app/src/main/java/com/safekeyboard/nlp/EnhancedToxicityAnalyzer.kt
+++ b/SafeKeyboardApp/app/src/main/java/com/safekeyboard/nlp/EnhancedToxicityAnalyzer.kt
@@ -70,14 +70,26 @@ class EnhancedToxicityAnalyzer(private val context: Context) {
     ): AnalysisResult {
-
-        // Try enhanced detection via WebView
-        if (webViewBridge.isReady()) {
-            try {
-                val jsonResult = webViewBridge.analyzeText(message, sensitivity, platform)
-                return parseEnhancedResult(jsonResult)
-            } catch (e: Exception) {
-                Log.e(TAG, "Enhanced detection failed, using fallback: ${e.message}", e)
-            }
-        }
-
-        // Fallback to basic analyzer
-        return useFallbackAnalyzer(message, sensitivity)
+        // Always run the lexicon fallback — it's fast, deterministic, and the
+        // only path known to actually produce non-zero scores today (the
+        // WebView bridge silently returns 0.0 because the JS globals never
+        // resolve; see DETECTION_TRACE_REPORT.md §1).
+        val fallback = useFallbackAnalyzer(message, sensitivity)
+
+        if (webViewBridge.isReady()) {
+            try {
+                val jsonResult = webViewBridge.analyzeText(message, sensitivity, platform)
+                val enhanced = parseEnhancedResult(jsonResult)
+                // Trust the WebView only if it produced a real signal.
+                if (enhanced.usingEnhanced && enhanced.toxicityScore > 0f) {
+                    return enhanced
+                }
+                Log.w(TAG, "WebView returned zero/none result; using lexicon " +
+                        "fallback score=${fallback.toxicityScore}")
+            } catch (e: Exception) {
+                Log.e(TAG, "Enhanced detection failed, using fallback: ${e.message}", e)
+            }
+        }
+        return fallback
     }
```

### Part B — Fix the JS-catch parse hole

Even after Part A, harden the parser so a JS-runtime error never masquerades as a clean result:

```diff
--- a/SafeKeyboardApp/app/src/main/java/com/safekeyboard/nlp/EnhancedToxicityAnalyzer.kt
+++ b/SafeKeyboardApp/app/src/main/java/com/safekeyboard/nlp/EnhancedToxicityAnalyzer.kt
@@ -91,7 +91,10 @@ class EnhancedToxicityAnalyzer(private val context: Context) {
             val json = JSONObject(jsonString)
-
-            // Check if this is a fallback result
-            if (json.optBoolean("fallback", false)) {
+
+            // Treat any error field OR explicit fallback flag as "not really
+            // enhanced" — the JS IIFE's catch block returns error without
+            // setting fallback:true.
+            if (json.optBoolean("fallback", false) || json.has("error")) {
+                if (json.has("error")) Log.w(TAG, "JS error: ${json.optString("error")}")
                 Log.w(TAG, "Received fallback result from WebView")
                 return AnalysisResult(
```

This causes `usingEnhanced=false` in the returned `AnalysisResult`, which the Part A logic then correctly discards in favor of `fallback`.

### Part C (later, out of scope) — Actually fix the WebView

The current `loadUrl` chain does not work. Correct approach: build one HTML host page in assets (`detection-library/host.html` with `<script src="analyzer.js"></script>` … `<script src="index.js"></script>`), and `webView.loadUrl("file:///android_asset/detection-library/host.html")`. Or better: replace WebView entirely with the already-shipped `RandomForestTextClassifier` + `sendwise_rf_v1.json.gz` (call `RandomForestTextClassifier.load(context, "sendwise_rf_v1.json.gz")` from `EnhancedToxicityAnalyzer.onCreate` equivalent and route `analyzeMessage` through `predict()`). This deletes ~300 lines of WebView glue and the JS bundle.

### Also recommended: relax live-analysis MIN_CHARS_FOR_LIVE

25 chars / 4 words is very conservative and misses common short abuse ("shut up idiot", "kys loser"). Consider 15 chars / 3 words once detection is verified working.

---

## 5. Debug logcat filter to confirm the fix

```bash
adb logcat -c && adb logcat \
  SafeKeyboardIME:V \
  EnhancedToxicityAnalyzer:V \
  WebViewBridge:V \
  RandomForestTC:V \
  ToxicityAnalyzer:V \
  *:S
```

**Before fix** you will see (proves root cause):
```
SafeKeyboardIME  D  Live scheduled for buffer len=39 words=6 delay=1000ms
SafeKeyboardIME  D  Live analyzed len=39 score=0.0     <-- the smoking gun
```

**After fix** you should see:
```
SafeKeyboardIME  D  Live scheduled for buffer len=39 words=6 delay=1000ms
EnhancedToxicity W  WebView returned zero/none result; using lexicon fallback score=0.67
SafeKeyboardIME  D  Live analyzed len=39 score=0.67
(warning overlay appears; then on user tap:)
SafeKeyboardIME  V  TelemetryCounts action=edited edited=1 sent_anyway=0 cancelled=0 blocked=0
```

Sanity check while typing (should appear on every keystroke past threshold):
```bash
adb logcat -s SafeKeyboardIME:D | grep "Live "
```

If you see repeated `Live analyze skipped: too short/few words` but never `Live analyzed len=...`, the debounce is cancelling before the runnable fires — user is typing too fast, drop MIN thresholds or the debounce delay.
