# Installing SendWise on Redmi Note 7 Pro

Target device: **Redmi Note 7 Pro**, Android 10, MIUI 12. Instructions also work for most MIUI 11–13 devices; menu paths may shift slightly.

Estimated time: **~5 minutes**.

---

## 1. Transfer the APK to the phone

Pick whichever is easiest:

- **Email**: attach `app-debug.apk` to yourself, open on the phone, tap Download.
- **Google Drive**: upload from laptop → open Drive app on phone → download.
- **USB cable**: connect phone → copy `app-debug.apk` into `Internal storage/Download/`.
- **adb** *(if you have it)*:
  ```bash
  adb install app-debug.apk
  ```
  If `adb install` succeeds, skip to step 4.

- [ ] APK now visible in the phone's **File Manager → Download**

---

## 2. Allow installs from unknown sources

MIUI blocks sideloads by default.

- [ ] Open **Settings**
- [ ] **Additional settings → Privacy → Special permissions** (older MIUI: **Privacy → Install via USB / Install apps from unknown sources**)
- [ ] **Install unknown apps**
- [ ] Select the app you'll open the APK from (e.g. **File Manager**, **Chrome**, or **Gmail**) → toggle **Allow from this source**

> [!WARNING]
> Turn this permission **off** again once SendWise is installed. It's a good habit and it's what reviewers will expect to see documented.

---

## 3. Install the APK

- [ ] Open **File Manager** → **Download** → tap `app-debug.apk`
- [ ] Tap **Install**

> [!NOTE]
> MIUI may show: *"This app was built for an older version of Android."* — this is expected for a debug build.
> Tap **Install Anyway**.

MIUI may also run a "sending for scan" step (~30 s). This is Xiaomi's cloud scan; you can wait it out or tap **Install without scanning**.

- [ ] Installation completes → **Open** or **Done**

---

## 4. Enable SafeKeyboard as an input method

- [ ] **Settings → Additional settings → Languages & input → Manage keyboards**
- [ ] Toggle **SafeKeyboard** → **ON**
- [ ] Confirm the "This input method may collect all text you type…" warning — **OK**
  *(This is Android's mandatory warning for every IME. SendWise processes text on-device only; see [`README.md#privacy-guarantees`](README.md#privacy-guarantees).)*

---

## 5. Select SafeKeyboard as the active keyboard

- [ ] Open any text field (e.g. Messages) so a keyboard pops up
- [ ] Swipe **down** from the top to open the notification shade
- [ ] Tap **Choose input method** (or the small keyboard icon in the nav bar)
- [ ] Select **SafeKeyboard**

Alternatively: **Settings → Additional settings → Languages & input → Current keyboard → SafeKeyboard**.

---

## 6. Grant "Draw over other apps" permission

Required for the pre-send warning overlay.

- [ ] **Settings → Apps → Manage apps → SafeKeyboard → Other permissions**
- [ ] Enable **Display pop-up windows while running in the background**
- [ ] Enable **Display pop-up window** *(MIUI splits this into two toggles — enable both)*
- [ ] **Settings → Apps → Permissions → Special access → Display over other apps → SafeKeyboard → Allow**

---

## 7. Smoke test

- [ ] Open any messaging app (WhatsApp, Messages, Telegram)
- [ ] Type a deliberately risky sentence, e.g. `"you're so stupid nobody likes you"`
- [ ] Press Send (or pause 1.5 s)
- [ ] The **warning overlay** should appear with **Edit** / **Send Anyway** buttons

If the overlay appears, the IME, classifier, and overlay permission are all working. ✅

---

## 8. Pair the phone with the parent dashboard

- [ ] Tap the **SafeKeyboard** app icon in the launcher
- [ ] **Settings → Parental Link → Generate Code**
- [ ] Note the 6-digit code
- [ ] On the parent's browser, open <https://sendwise.vercel.app/pair>
- [ ] Sign in with `PARENT_EMAIL` + password (set during [`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md) step 4)
- [ ] Enter the 6-digit code → **Pair**

The phone now shows as a paired device in the dashboard. Violation counters begin populating on the next flagged message.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| SafeKeyboard doesn't appear in **Manage keyboards** | Reboot the phone; MIUI sometimes caches the IME list |
| Keyboard picker (step 5) doesn't list SafeKeyboard | Return to step 4 and re-enable |
| Warning overlay never appears | Step 6 — grant "Display over other apps" AND "Display pop-up window" |
| Overlay flashes then vanishes | MIUI **Battery saver** killed the IME — Settings → Apps → SafeKeyboard → Battery saver → **No restrictions** |
| Pair code says "invalid" | Codes expire after 5 minutes; generate a new one |
| Dashboard shows "0 events" after clearly triggering the overlay | Confirm the phone has internet; confirm `CERT_PIN_SHA256` in the APK matches the current Vercel cert ([`VERCEL_DEPLOY.md`](VERCEL_DEPLOY.md) step 6) |
| "App not installed" during step 3 | An older SafeKeyboard build is present with a different signing key — uninstall it first: **Settings → Apps → SafeKeyboard → Uninstall** |

---

<sub>Everything working? You're ready to demo. See [`README.md`](README.md) for the paper and reproducibility notes.</sub>
