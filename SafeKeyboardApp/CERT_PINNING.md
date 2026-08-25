# Certificate Pinning — SafeKeyboard Android

The Android app pins the TLS certificate of the SendWise backend
(`sendwise.vercel.app`) to defend against MITM attacks even if a
trusted CA is compromised. This document explains how to obtain the
SPKI SHA-256 pin **after the Vercel deploy exists** and where to paste
it.

The paper's §Security/Transport claim is:

> HTTPS POST, TLS 1.3, certificate pinning.

This doc backs the "certificate pinning" half of that claim.

---

## 1. Prerequisites

- Backend deployed and reachable at `https://sendwise.vercel.app`
- `openssl` installed locally (macOS ships with it; on Linux install
  `openssl` from your package manager)

---

## 2. Generate the SPKI SHA-256 pin

Run this one-liner. It fetches the leaf certificate, extracts its
Subject Public Key Info, hashes it with SHA-256, and base64-encodes
the result — the exact format OkHttp's `CertificatePinner` and
Android's `network-security-config` expect.

```bash
openssl s_client -connect sendwise.vercel.app:443 -servername sendwise.vercel.app < /dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

Example output (yours will differ):

```
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

Copy that base64 string — that is your pin.

---

## 3. Where to paste the pin

Two files must be kept in sync.

### 3a. `SafeKeyboardApp/app/build.gradle`

Replace the placeholder in `defaultConfig`:

```groovy
buildConfigField "String", "CERT_PIN_SHA256", "\"<PASTE_PIN_HERE>\""
```

This value is read by
`SafeKeyboardApp/app/src/main/java/com/safekeyboard/network/RetrofitClient.kt`
at runtime and passed to OkHttp's `CertificatePinner`.

### 3b. `SafeKeyboardApp/app/src/main/res/xml/network_security_config.xml`

Replace the placeholder inside the `<pin-set>` for
`sendwise.vercel.app`:

```xml
<pin digest="SHA-256"><PASTE_PIN_HERE></pin>
```

This adds a second layer enforced by the Android platform itself
(defense in depth — pinning still applies if a future code path
bypasses `RetrofitClient`).

---

## 4. Verify

1. Rebuild the app (`./gradlew :app:assembleDebug`).
2. Launch on a device/emulator with real network access.
3. Trigger a network call (e.g. log a violation).
4. Expected: request succeeds.
5. Sanity check pinning is active: temporarily change one character in
   the pin, rebuild, and confirm the request fails with a
   `SSLPeerUnverifiedException` / `Certificate pinning failure`. Revert
   the change afterwards.

---

## 5. Important tradeoff: Vercel edge certificate rotation

Vercel provisions and **rotates** edge TLS certificates automatically
(often via Let's Encrypt). Pinning the **leaf** certificate's SPKI
means the app will **break** every time Vercel rotates the cert —
which can be as frequent as every ~60–90 days.

You have three options:

| Strategy | Pro | Con |
|---|---|---|
| Pin the **leaf** SPKI | Tightest security | Breaks on every Vercel rotation; requires app update |
| Pin the **intermediate CA** SPKI (e.g. Let's Encrypt R3/R10/E1) | Survives leaf rotation | Trusts anyone Let's Encrypt issues to; slightly weaker |
| Pin **multiple** pins (leaf + backup + CA) | Graceful rotation | Must proactively rotate backup pin |

**Recommended for SendWise:** pin the **intermediate CA** SPKI plus a
backup pin. To get the intermediate's pin, modify step 2 to hash the
second certificate in the chain:

```bash
openssl s_client -connect sendwise.vercel.app:443 -servername sendwise.vercel.app -showcerts < /dev/null 2>/dev/null \
  | awk '/BEGIN CERT/{i++} i==2' \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

Add both pins in `network_security_config.xml`:

```xml
<pin-set expiration="2026-12-31">
    <pin digest="SHA-256">LEAF_OR_PRIMARY_PIN</pin>
    <pin digest="SHA-256">INTERMEDIATE_CA_BACKUP_PIN</pin>
</pin-set>
```

OkHttp's `CertificatePinner` likewise accepts multiple `.add(host, ...)`
calls for the same host — extend `RetrofitClient.kt` accordingly if you
adopt this strategy.

---

## 6. Dev builds without a pin

If `CERT_PIN_SHA256` is left as `PLACEHOLDER_UPDATE_AFTER_DEPLOY`,
`RetrofitClient` **skips pinning** and logs a warning:

```
W/RetrofitClient: CERT_PIN_SHA256 is a placeholder — certificate pinning DISABLED. ...
```

TLS 1.3 enforcement and the system trust store still apply. This is
intentional so devs can build and run the app before the backend is
deployed. **Do not ship a release build with the placeholder.**
