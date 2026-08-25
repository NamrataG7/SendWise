# Deploying the Parental Dashboard to Vercel

This guide walks Namrata (or any reviewer) through deploying [`parental-dashboard/`](parental-dashboard/) to Vercel's free tier. Estimated time: **~15 minutes**.

---

## Prerequisites

- [x] Repository pushed to GitHub: [`NamrataG7/SendWise`](https://github.com/NamrataG7/SendWise)
- [x] Vercel account: <https://vercel.com/namratag7s-projects>
- [x] A password you will remember for the parent login

You do **not** need Node, npm, or the Vercel CLI installed locally — the entire deployment happens in the Vercel web UI.

---

## Step 1 — Import the repository

1. Open <https://vercel.com/new>
2. Under **Import Git Repository**, select **`NamrataG7/SendWise`**
3. In the **Configure Project** screen:

> [!WARNING]
> **Critical:** set **Root Directory** to `parental-dashboard`.
> If you leave it at the repo root, Vercel will try to build the Android app and fail.

- [ ] Root Directory: `parental-dashboard`
- [ ] Framework Preset: **Next.js** (auto-detected — leave as-is)
- [ ] Build Command: *(leave default: `next build`)*
- [ ] Output Directory: *(leave default)*
- [ ] Install Command: *(leave default: `npm install`)*

Do **not** click *Deploy* yet — env vars come first (Step 4).

---

## Step 2 — Confirm framework preset

Vercel should have auto-detected **Next.js 14**. If it did not:

- [ ] Manually set Framework Preset → **Next.js**
- [ ] Node.js Version → **20.x** (Project Settings → General, if needed)

---

## Step 3 — Provision Vercel KV (Upstash Redis)

The dashboard stores anonymised violation counters in Redis.

1. In your project, open the **Storage** tab
2. Click **Create Database** → choose **KV** (Upstash Redis, free tier)
3. Name it e.g. `sendwise-kv`
4. Click **Connect Project** → select the SendWise deployment → **Connect**

> [!NOTE]
> Vercel auto-injects the following env vars into your project:
> `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, and `REDIS_URL`.
> You do not need to copy them by hand.

- [ ] KV database created
- [ ] Attached to the SendWise project
- [ ] `REDIS_URL` visible under Settings → Environment Variables

---

## Step 4 — Set the remaining environment variables

Go to **Settings → Environment Variables** and add the following for **Production** (and **Preview** if you want PR previews to work):

### 4a. `NEXTAUTH_SECRET`

Generate a 32-byte random secret:

```bash
openssl rand -base64 32
```

- [ ] Add `NEXTAUTH_SECRET` = *(paste the output)*

### 4b. `NEXTAUTH_URL`

Use the URL Vercel assigns. For a custom domain:

```
https://sendwise.vercel.app
```

- [ ] Add `NEXTAUTH_URL` = `https://sendwise.vercel.app` *(or the URL shown at the top of the project page)*

### 4c. `PARENT_EMAIL`

Pick the email address the parent will use to sign in.

- [ ] Add `PARENT_EMAIL` = `parent@example.com`

### 4d. `PARENT_PASSWORD_HASH`

Never store the plaintext password. Hash it with bcrypt:

```bash
node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))"
```

> [!TIP]
> If you don't have Node installed locally, run the command in a temporary [Vercel serverless function](https://vercel.com/docs/functions) or use any online bcrypt generator with cost factor `10`. Do not commit the plaintext anywhere.

- [ ] Add `PARENT_PASSWORD_HASH` = `$2a$10$…` *(the full bcrypt hash)*

### Environment variables checklist

| Name | Example | Scope |
| --- | --- | --- |
| `NEXTAUTH_SECRET` | `k9…=` | Production, Preview |
| `NEXTAUTH_URL` | `https://sendwise.vercel.app` | Production |
| `PARENT_EMAIL` | `parent@example.com` | Production, Preview |
| `PARENT_PASSWORD_HASH` | `$2a$10$…` | Production, Preview |
| `REDIS_URL` *(auto)* | `rediss://…` | Production, Preview |

---

## Step 5 — Deploy

1. Return to the **Deployments** tab
2. Click **Redeploy** (or, if this is the first import, click **Deploy** on the initial screen)
3. Wait ~2 minutes for the build to complete
4. Visit the assigned URL and confirm the login page loads

- [ ] Build succeeded (green check)
- [ ] Login page renders at `https://sendwise.vercel.app`
- [ ] Sign in with `PARENT_EMAIL` + your plaintext password → dashboard loads

---

## Step 6 — Obtain the certificate pin for Android

The Android IME pins the Vercel TLS certificate so that a compromised CA cannot man-in-the-middle the metadata channel.

Follow the pinning procedure in [`SafeKeyboardApp/CERT_PINNING.md`](SafeKeyboardApp/CERT_PINNING.md) to extract the SHA-256 pin from `sendwise.vercel.app`:

```bash
openssl s_client -connect sendwise.vercel.app:443 -servername sendwise.vercel.app </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
```

- [ ] SHA-256 pin captured (looks like `sha256/AbCd…=`)

---

## Step 7 — Update Android build config and rebuild the APK

In `SafeKeyboardApp/app/build.gradle` (or the equivalent `BuildConfig` provider), set:

```groovy
buildConfigField "String", "API_BASE_URL", "\"https://sendwise.vercel.app\""
buildConfigField "String", "CERT_PIN_SHA256", "\"sha256/AbCd…=\""
```

Then push to `main` — GitHub Actions will produce a fresh APK. See [`BUILD_APK.md`](BUILD_APK.md) for how to download the artefact.

- [ ] `API_BASE_URL` updated
- [ ] `CERT_PIN_SHA256` updated
- [ ] Push triggers green Actions build
- [ ] New APK downloaded and installed per [`INSTALL_ON_REDMI.md`](INSTALL_ON_REDMI.md)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build fails immediately with "No Next.js version detected" | Root Directory not set to `parental-dashboard` | Project Settings → General → Root Directory → `parental-dashboard` → Redeploy |
| `[next-auth][error][NO_SECRET]` in build logs | `NEXTAUTH_SECRET` missing | Add env var (Step 4a) and redeploy |
| Login returns 401 with correct password | `PARENT_PASSWORD_HASH` was hashed for a different password, or contains a shell-escaped `$` | Re-generate the hash and paste it exactly as printed (Vercel handles `$` correctly in env UI) |
| Dashboard loads but shows "Redis connection failed" | KV not attached to project | Storage tab → Connect Project |
| Android app can't reach API (`SSLPeerUnverifiedException`) | Cert pin mismatch after Vercel rotated certs | Repeat Step 6 and rebuild the APK |
| `NEXTAUTH_URL` warning in logs | Value doesn't match the actual deployed URL | Update env var to the exact production URL, including `https://` |

---

<sub>Deployment complete. Return to [`README.md`](README.md) for the full project map.</sub>
