# SendWise — Paper ↔ Code Alignment Review

**Reviewer role:** Independent adversarial reviewer (read-only).
**Repo commit context:** branch `main`, "Phase 2 complete" claimed.
**Paper:** `SendWise.docx` (extracted claims summarised inline).
**Design spec:** `DESIGN_SPEC_FROM_PAPER.md` (used as secondary source of truth).

> **RESOLUTION NOTE (F2 — Category Taxonomy):** The triple-taxonomy mismatch
> described in claim 3 / finding F2 below has been resolved. The codebase now
> uses the paper's canonical 5 categories end-to-end:
> `harassment, threats, hate_speech, sexual_content, self_harm`. The
> `ToxicityAnalyzer` emits these names directly, `ViolationLogger.mapCategory()`
> is now a pass-through identity, and the API/dashboard schema
> (`schema.ts`, `types.ts`) enumerates the same five values. The historical
> descriptions of the mismatch below are preserved for the review record.

---

## Executive summary

The Android intervention UI (Fig 2), the on-device inference plumbing (WebView JS library), the transport hardening (TLS 1.3 + HTTPS-only + placeholder pinning), the 500-char RAM buffer, the SHA-256 user hash, the 100/hr rate limit, the pairing handshake, and the 2×2 dashboard grid (Fig 3) all exist in code and broadly resemble the paper's description. However, the two claims that most directly justify the paper — **the Random Forest + TF-IDF classifier with reported metrics of P 85.96 / R 95.73 / F1 90.58**, and **the 5-category taxonomy** — do not correspond to what the code actually does. There is no model artifact, no training script, no `sendwise_dataset.csv`, and no `model_training/` directory (all referenced by the top-level README). The runtime classifier is a hand-written lexicon + regex heuristic, and the *category enum shipped to the API and rendered on the dashboard is a completely different set of five labels* from the paper's. Combined with an authenticated-but-not-scoped IDOR on `/api/violations/[user_id_hash]` and `/api/insights/[user_id_hash]`, an unauthenticated + unrate-limited pairing surface that permits attacker-in-the-middle account grafting, and a dashboard that renders hard-coded Fig-3 numbers rather than live aggregates, the paper as currently supported by this repo would not survive a determined reviewer. Fig 2 UI and privacy plumbing are the strongest parts; the ML/evaluation story and the parent-side authorization model are the weakest.

---

## Claim-by-claim scorecard

| # | Claim | Status | Evidence (file:line) | Severity |
|---|---|---|---|---|
| 1 | On-device inference; message content never leaves device | Partially met | `ApiService.kt:26-32` (no text field on wire); `schema.ts:63-67` and `violations/route.ts:22-33` (server rejects `text/message/content`); `WebViewBridge.java:49-79` (JS runs locally); `IncidentCard.tsx:98,116` (UI declares no text shown) | MINOR — meets claim; caveats around WebView JS injection surface and detection-library JS shipped as APK asset (fine) |
| 2 | RF, 200 trees, TF-IDF 1-2 grams, 5000 features, threshold 0.5 (favor recall) | **NOT MET** | No RF, no TF-IDF, no model file. Actual: `ToxicityAnalyzer.kt:38-77` (lexicons + intensifiers); `EnhancedToxicityAnalyzer.kt` delegates to `WebViewBridge` which runs `shared/detection-library/*.js` (rule-based). Threshold 0.5 is honored (`SafeKeyboardIME.kt:126,244`). README claims `sendwise_dataset.csv` + `model_training/MODEL_TRAINING.md` — **neither file exists in repo**. | **CRITICAL** |
| 3 | 5 categories: harassment, threats, hate speech, sexual content, self-harm risk | **NOT MET** | On-device analyzer emits `{harassment, hate, threat, sexual, none}` (paper-adjacent minus self-harm) — see `ToxicityAnalyzer.kt:93-98`. API/dashboard schema is a *different 5*: `{self_harm, privacy_risk, risky_behavior, meeting_stranger, cyberbullying}` — see `schema.ts:12-18`, `types.ts:8-12`. Android→API mapping collapses `harassment/hate → cyberbullying`, `threat/sexual → risky_behavior` (`ViolationLogger.kt:51-66`). Neither set matches the paper's 5. | **CRITICAL** |
| 4 | Metadata schema: user_id_hash, timestamp, category, severity, action, session_id | Met | `schema.ts:29-42`; `ApiService.kt:37-44`; `ViolationLogger.kt:107-114`. Strict Zod `.strict()` blocks unknown fields. | ✅ |
| 5 | `SHA-256(Android ID + salt)` for user_id_hash | Partially met | `UserIdGenerator.kt:37,46-58`. Correct algorithm, but salt `"SafeKeyboard_v1_2024_Privacy_Salt"` is a **hard-coded constant compiled into the APK** — trivially extractable, offers no protection against pre-image attack given AndroidID. This weakens the "not reversible" claim in the file's own header comment. | **MAJOR** |
| 6 | TLS 1.3 + certificate pinning | Partially met | `RetrofitClient.kt:50-52` restricts to TLS 1.3/1.2. Pinning code exists (`:54-69`) **but the pin is `"PLACEHOLDER_UPDATE_AFTER_DEPLOY"` and the code silently disables pinning when the placeholder is present** (`:56-63`). Same placeholder in `network_security_config.xml:28`. If the paper claims pinning is enforced, that's overselling the repo state. | **MAJOR** |
| 7 | Rate limit 100/hr/device | Partially met | `violations/route.ts:10,44-56`. Correct algorithm, but keyed by `user_id_hash` which any unauthenticated attacker can forge, so the limit protects the *server* from a specific device but does not prevent a hostile actor from burning a specific child's quota (denial-of-logging) or flooding under many forged hashes. No global IP-based limit. | **MAJOR** |
| 8 | 500-char RAM buffer, cleared after inference | Met | `MessageBuffer.kt:17` (`maxLength = 500`); cleared in `SafeKeyboardIME.kt:88-91` (onStartInput), `:135` (finally block in onFinishInput), `:388` (after sent_anyway). No disk persistence. | ✅ Minor gap: no clear on `onFinishInput` short-circuit paths if the coroutine throws before `finally` — actually the `finally` block covers it. |
| 9 | Pairing code (parent ↔ child) | Partially met | Codes generated `pairing/generate/route.ts:27` (crypto random 6-digit, 15-min TTL) and redeemed at `pairing/redeem/route.ts`. **Both endpoints unauthenticated (`middleware.ts:32-33,48-49`) and neither is rate-limited**. `redeem` accepts any `parent_id` string from the request body without checking it matches the session (`:22,31`) — an authenticated (or anonymous) attacker who guesses a live 6-digit code can graft a child onto their own arbitrary `parent_id`. 10⁶ code space with 15 min TTL is brute-forceable given no rate limit. | **CRITICAL** |
| 10 | Warn, don't block (user decides Edit or Continue) | Partially met | UI has both buttons (`warning_overlay.xml:210-273`). IME consumes Enter and shows overlay (`SafeKeyboardIME.kt:229-254`) — the user still retains "Continue" (i.e. send anyway). However the `ActionEnum` in `schema.ts:24` contains `blocked` and `cancelled` alongside `edited/sent_anyway`, contradicting the "warn only" claim in the API contract even though the client never emits `blocked`. And `handleEditChoice` (`SafeKeyboardIME.kt:397-403`) **never logs any `edited` event** — the entire "Edited vs Sent Unchanged" data path for Fig 3 is not wired up. | **MAJOR** |
| 11 | Fig 2 warning UI + Fig 3 dashboard 2×2 grid | Met | Fig 2: `warning_overlay.xml:1-276` matches DESIGN_SPEC §Fig 2 (hero band, chips, buttons, verbatim strings). Fig 3: `InsightsGrid.tsx:10-15` renders the 2×2 grid (Trend, Category, Severity, EditedVsSent). | ✅ (visual only — see claim #12) |
| 12 | Reported metrics P 85.96 / R 95.73 / F1 90.58 | **NOT MET / NOT REPRODUCIBLE** | Numbers appear only in `README.md:66-70`. Referenced `model_training/MODEL_TRAINING.md` and `sendwise_dataset.csv` **do not exist**. No training script, no seed, no dataset commit hash. Dashboard donuts (`insights-aggregates.ts:33-66`) return **hard-coded percentages exactly matching the Fig 3 mock** (10/18/26/38/21 trend, 45/25/20/10 categories, 25/50/25 severity, 60/40 edited/sent) — the dashboard is a *static reproduction of the mockup*, not aggregated telemetry. `computeInsights()` is called from the API route but the client-facing cards import from `insights-aggregates.ts`, not the server payload. | **CRITICAL** |

---

## Detailed findings

### F1 — No model, no training pipeline, no dataset (CRITICAL, claim 2 & 12)

`README.md:62-70`:
> Metrics reported in the paper (Random Forest, `sendwise_dataset.csv`, 20,122 rows, 80/20 stratified split):
> Precision 85.96 | Recall 95.73 | F1 90.58
> Retraining is deterministic (fixed `random_state=42`); see `model_training/MODEL_TRAINING.md`.

`find` for `model_training/`, `sendwise_dataset.csv`, `*.tflite`, `*.onnx`, `*.pkl`, `*.joblib`, `*.py`, `RandomForest`, `TfidfVectorizer`, `n_estimators` all return **zero hits** across the repo.

Runtime classifier in `SafeKeyboardApp/app/src/main/java/com/safekeyboard/nlp/ToxicityAnalyzer.kt:82-122` is a lexicon lookup with rule-based context modifiers:
```kotlin
val harassmentScore = calculateCategoryScore(normalizedMessage, words, harassmentTerms)
...
val severity = when { adjustedScore >= 0.75f -> "high" ; adjustedScore >= 0.45f -> "medium" ; ... }
```
`EnhancedToxicityAnalyzer.kt` delegates to `WebViewBridge.java:49-67` which loads `shared/detection-library/*.js` — all JS heuristics, no ML. `tensorflow-lite` is declared in `build.gradle:88-89` but nothing loads or invokes a model. `assets/detection-library` contains only JS.

**Reviewer risk:** any reviewer who clones and runs a `grep -R RandomForest .` finds nothing and rejects the paper on reproducibility. This is the single most damaging gap.

### F2 — Category taxonomy triple mismatch (CRITICAL, claim 3)

Three different 5-tuples coexist:

| Layer | Categories |
|---|---|
| Paper | `harassment, threats, hate speech, sexual content, self-harm risk` |
| Android analyzer | `harassment, hate, threat, sexual, none` (`ToxicityAnalyzer.kt:93-98`) — 4 real + none, no self-harm |
| API + dashboard schema | `self_harm, privacy_risk, risky_behavior, meeting_stranger, cyberbullying` (`schema.ts:12-18`, `types.ts:8-12`) |

`ViolationLogger.kt:51-66` bridges them by lossy collapse:
```kotlin
"harassment"       to "cyberbullying",
"hate"             to "cyberbullying",
"threat"           to "risky_behavior",
"sexual"           to "risky_behavior",
```
Consequences:
- The dashboard cannot distinguish harassment from hate — both become "Cyberbullying".
- The dashboard cannot distinguish threats from sexual content — both become "Risky Behavior".
- Two dashboard categories (`privacy_risk`, `meeting_stranger`) have *no producer* — they can never be populated from the Android app.
- `self-harm` — the one category shared with the paper — is not emitted by the on-device analyzer at all (no `self_harm` in `ToxicityAnalyzer.kt`).
- A reviewer running the app and comparing the dashboard's "Category Distribution" to the paper's Table X will find category names that don't appear anywhere in the paper.

Also: the Fig 2 mock (in the paper) shows `Category: Harassment` — a paper-taxonomy label. If the same screenshot is used in the deployed app *after* the mapping, the chip will read `Category: Cyberbullying`. The overlay does render whatever category string the analyzer emits pre-mapping (`WarningOverlayManager.kt:52,102-107`), so on-device the chip still says "Harassment"; but the parent dashboard will show "Cyberbullying" for the same event. **Same event, two different labels**, depending on surface. A reviewer will notice.

### F3 — Hard-coded user_id_hash salt (MAJOR, claim 5)

`UserIdGenerator.kt:37`:
```kotlin
private const val APP_SALT = "SafeKeyboard_v1_2024_Privacy_Salt"
```
Kotlin `const val` compiles as an inline string constant into the APK's DEX; `strings` on the APK will surface it. Any attacker with `ANDROID_ID` (obtainable for their own device or via other malware on the child's device) can compute a valid `user_id_hash` for any device. This does not by itself break privacy of message content (message text never leaves the device), but combined with F5 (unauthenticated ingest) it enables:
- Poisoning a specific child's dashboard with fabricated violations.
- Exhausting the 100/hr rate limit for a specific child (silencing legitimate telemetry).

**Fix direction:** move the salt to a per-install secret stored in Android Keystore, generated on first launch. The salt does not need to be shared with the server for the hash to remain stable per install.

### F4 — Certificate pinning is disabled by default (MAJOR, claim 6)

`build.gradle:20`:
```groovy
buildConfigField "String", "CERT_PIN_SHA256", "\"PLACEHOLDER_UPDATE_AFTER_DEPLOY\""
```
`RetrofitClient.kt:56-63`:
```kotlin
if (pin.isBlank() || pin == PIN_PLACEHOLDER) {
    Log.w(TAG, "... certificate pinning DISABLED ...")
    null
}
```
Same placeholder in `network_security_config.xml:28`. If the paper says "TLS 1.3 with certificate pinning is enforced," that is an *aspirational* statement about the codebase, not a factual one. Any release built from a fresh `main` checkout ships without pinning and only logs a warning (in a keyboard IME the user will never see logcat). The `CERT_PINNING.md` doc is not a substitute for a working default.

**Reviewer risk:** low likelihood a reviewer discovers this without reading `build.gradle`, but a security-oriented reviewer will.

### F5 — Unauthenticated ingest + IDOR + unauthenticated pairing (CRITICAL, claims 7, 9)

Three interlocking issues:

1. `POST /api/violations` is public by design (`middleware.ts:56-58`, `violations/route.ts`). Any host on the internet can inject arbitrary `{user_id_hash, category, severity, action, session_id}` records. There is no HMAC, no device attestation, no shared secret.
2. `GET /api/violations/[user_id_hash]/route.ts:6-7`:
   ```ts
   // TODO(phase-2): require parent auth + verify parent is linked to this user_id_hash
   // ... For now, open read.
   ```
   Middleware requires a session token to reach this route, but the route itself never checks that the authenticated parent is actually paired to the requested `user_id_hash`. Any signed-in parent can read any child's violation feed by iterating hex hashes. Same TODO left in `GET /api/insights/[user_id_hash]/route.ts:6`.
3. `POST /api/pairing/redeem/route.ts:22,31`:
   ```ts
   const { code, parent_id } = parsed.data;
   ...
   await redis.sadd(`parent:${parent_id}:children`, user_id_hash);
   ```
   `parent_id` is taken from the request body, not from the authenticated session. Combined with (a) unauthenticated redeem endpoint (`middleware.ts:32-33,48-49`), (b) no rate limit on `/pairing/redeem`, and (c) 10⁶ code space × 15 min TTL, a brute-force attacker can pair themselves to any child currently on the pairing screen and then read that child's data via (2) — even without solving (1)-style forgery.

**Reviewer risk:** high. This is exactly the kind of issue that reviewers of "privacy-preserving" systems love to catch. Fix before submission.

### F6 — Dashboard renders static Fig-3 numbers, not aggregated data (CRITICAL, claim 12)

`insights-aggregates.ts:33-66` returns hard-coded arrays whose values are *exactly* the numbers shown in the Fig 3 mock. `InterventionTrendCard.tsx:16`, `CategoryDistributionCard.tsx:8`, `SeverityDistributionCard.tsx`, `EditedVsSentCard.tsx` all import from `./insights-aggregates`, not from any server route. `/api/insights/[user_id_hash]` exists and calls `computeInsights` but the client dashboard cards do not consume its output.

Combined with F2 (two categories have no producer) and F7 (edited action never emitted), this dashboard *cannot* display live telemetry even if the ingest pipeline were working. It is a pixel-faithful reproduction of the mock. If the paper implies deployed telemetry, this is a misrepresentation.

### F7 — `edited` action never logged (MAJOR, claim 10)

`SafeKeyboardIME.kt:397-403`:
```kotlin
private fun handleEditChoice() {
    // Simply dismiss the popup, buffer remains intact
    // User can continue editing
    sendIntentDetector.reset()
}
```
No `violationLogger.logViolation(..., action = "edited")` call. Only `sent_anyway` is ever logged (`:376-380`). Consequences:
- The "Edited vs Sent Unchanged" donut has no data source. Even if F6 were fixed to consume real aggregates, the "Edited" slice would be perpetually 0%.
- The paper's implied efficacy metric (users edit ~60% of the time) has no telemetry backing.

### F8 — Redundant/misleading `ActionEnum` values (MINOR, claim 10)

`schema.ts:24`:
```ts
export const ActionEnum = z.enum(['edited', 'sent_anyway', 'blocked', 'cancelled']);
```
Paper claim: warn-don't-block. `blocked` and `cancelled` are never emitted by the client (`grep logViolation` shows one call site with `"sent_anyway"`). Their presence in the schema invites a reviewer to ask "under what conditions do you block?" and the answer will be "we don't." Remove from enum or document explicitly.

### F9 — WebView JS-injection surface (MINOR, claim 1)

`WebViewBridge.java:107-125` builds JS via string interpolation and relies on `escapeJavaScript` at `:216-223` which escapes `\ ' " \n \r` but **not** U+2028 / U+2029 (JS line terminators). A message containing these unicode characters could terminate the JS string literal. Because the WebView is completely isolated with no network permission on its origin (`file:///android_asset`) and no `AndroidBridge` method returns sensitive data, the practical impact is analyser evasion rather than data exfiltration. Still worth fixing — a reviewer with a security background will call it out.

### F10 — Overlay dismissal paths not fully accounted for (MINOR)

The scrim `FrameLayout` in `warning_overlay.xml:16-21` is `clickable=true focusable=true` which prevents dismissal by outside-tap (good). But there's no evidence in `WarningOverlayManager` that a back-press or IME switch is handled. If the overlay is dismissed by system means, the buffer clearing (`SafeKeyboardIME.kt:135` finally block) fires on `onFinishInput` but the "the user made no decision" case does not log a `cancelled` action. Combined with F7, the dashboard's action distribution will over-represent `sent_anyway`.

### F11 — Session ID lifetime (NIT, claim 4)

`ViolationLogger.kt:42`: `SESSION_ID` is a companion-object `val`, so it's shared across all `ViolationLogger` instances within a process and regenerated per process restart. This matches the paper's session semantics but is fragile — if `SafeKeyboardIME` is killed and restarted mid-conversation, the same conversation gets a new `session_id`. Reasonable, but document it if the paper defines `session_id` more strictly.

### F12 — `EnhancedToxicityAnalyzer` fallback path (NIT)

`WebViewBridge.java:97-100` uses a synchronous "not initialized yet" fallback. If a message is analyzed within the first ~500 ms of IME creation, it hits `getFallbackResult` (rule-based, likely returns non-toxic), giving a race window where warnings are suppressed. Low practical impact but affects the "always intervenes" narrative.

---

## Risk register (top 5 before submission)

| # | Risk | Trigger | Impact |
|---|---|---|---|
| 1 | Reviewer asks "where is the model / dataset / training script?" | Any reviewer with reproducibility mindset | Paper likely rejected — reported metrics not reproducible from repo (F1) |
| 2 | Reviewer notes on-device categories ≠ dashboard categories ≠ paper categories | Screenshot comparison, or reading `schema.ts` | Reject on internal inconsistency (F2) |
| 3 | Security reviewer finds unauthenticated ingest + IDOR reads + unauthenticated pairing brute-force chain | 10 min in `middleware.ts` + `[user_id_hash]/route.ts` | Reject on privacy/security claims being unsupported (F5) |
| 4 | Reviewer opens dashboard and finds Fig 3 numbers are hard-coded | Runs the dashboard, inspects `insights-aggregates.ts` | Reject on "deployed telemetry" being fabricated (F6) |
| 5 | Reviewer notes cert pinning is a placeholder that disables silently | Reads `build.gradle` or `RetrofitClient.kt` | Undermines TLS/pinning claim (F4). Lower likelihood but easy find |

---

## Recommended pre-submission fixes (ranked)

**P0 — do these or don't submit:**

1. **Add a real ML pipeline or rewrite the paper's ML claims.** Either (a) commit `model_training/train.py`, `sendwise_dataset.csv` (or a Kaggle/HF pointer with SHA-256), a `requirements.txt` with pinned versions, `random_state=42`, and the resulting `model.tflite` used by the Android app; or (b) reframe the paper to describe the deployed rule-based+heuristic classifier honestly and drop the RF/TF-IDF/85.96 claims. Half-measures will be caught.
2. **Unify the category taxonomy end-to-end** on the paper's 5: `harassment, threats, hate_speech, sexual_content, self_harm_risk`. Update `ToxicityAnalyzer.kt`, add self-harm detection to the analyzer, remove `privacy_risk`/`meeting_stranger`/`risky_behavior`/`cyberbullying` from `schema.ts`/`types.ts`/`insights-aggregates.ts`, delete `CATEGORY_MAP` in `ViolationLogger.kt`.
3. **Close the auth/IDOR/pairing chain.** Add server-side session→child membership check inside `GET /api/violations/[user_id_hash]` and `GET /api/insights/[user_id_hash]`. Take `parent_id` from the authenticated session in `pairing/redeem`, and require authentication + rate limit on both pairing endpoints. Add a shared-secret HMAC on `POST /api/violations` (secret provisioned during pairing) so ingest isn't spoofable.
4. **Make the dashboard render aggregated data.** Have the four cards call `/api/insights/[user_id_hash]` and derive slices from the response. Delete or clearly namespace the hard-coded `getCategoryDistribution()`/`getSeverityDistribution()`/`getEditedVsSent()`/`getInterventionTrend()` as "mock only".
5. **Emit `edited` action** in `handleEditChoice` so the Edited-vs-Sent chart has data.

**P1 — do these before external review:**

6. Replace the hard-coded `APP_SALT` with a per-install secret in Android Keystore.
7. Fix the cert-pin story: either commit the real pin to `build.gradle`/`network_security_config.xml` and fail-closed if the placeholder is present in release builds, or remove pinning from the paper's claims and keep TLS 1.3-only.
8. Trim `ActionEnum` to `{edited, sent_anyway}` (matching warn-not-block) or document what `blocked`/`cancelled` mean.

**P2 — cosmetic but reviewer-facing:**

9. Handle U+2028/U+2029 in `escapeJavaScript`.
10. Log a `cancelled` action if the overlay is dismissed without a decision.
11. Document the `session_id` lifetime explicitly in the paper.

---

## Reproducibility scorecard

| Requirement | Present? | Notes |
|---|---|---|
| Dataset committed or linked with hash | ❌ | `sendwise_dataset.csv` referenced in README, not in repo |
| Training script | ❌ | `model_training/` referenced, not in repo |
| Fixed random seed | ❌ | Claimed (`random_state=42`) but no code to seed |
| Pinned Python deps (`requirements.txt` / `poetry.lock`) | ❌ | No Python in repo |
| Pinned JS deps | ⚠️ | `package.json` uses caret ranges (`^2.4.3`, `^5.4.1`), no `package-lock.json` inspected |
| Pinned Android deps | ✅ | Exact versions in `build.gradle:66-89` |
| Model artifact (`.tflite`/`.onnx`/`.pkl`) | ❌ | None; `tensorflow-lite` dependency present but unused |
| Evaluation script producing P/R/F1 | ❌ | Not present |
| Held-out test split reproducible | ❌ | No dataset, so no split |
| Runtime classifier matches the one being evaluated | ❌ | Runtime is rule-based; paper describes RF |
| Instructions to reproduce metrics | ❌ | `MODEL_TRAINING.md` doesn't exist |
| Example telemetry / dashboard demo data | ⚠️ | Present as hard-coded numbers matching the mock (Fig 3), which is misleading rather than helpful |

**Verdict:** A reviewer *cannot* reproduce the paper's metrics from this repo. Reproducibility score: **0 / 12 essential items met** for the ML claim; **3 / 12** if we count "runtime app builds and runs" separately (Android deps pinned, dashboard runs, Fig 2 UI is faithful).

---

## Bottom line

The repo delivers a convincing **UX prototype** of the paper (Fig 2 warning, Fig 3 dashboard grid, on-device buffer, TLS transport). It does **not** deliver the paper's ML claim, its category taxonomy, its authorization model, or its live-telemetry story. Submitting the paper with the repo in its current state carries a high risk of a reviewer catching at least F1, F2, F5, or F6 — any one of which is a rejection-grade finding. Fix P0 items 1–5 before submission; treat P1 items as mandatory for camera-ready.
