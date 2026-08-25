# Deploying the Parental Dashboard to Vercel

This guide walks Namrata (or any reviewer) through deploying [`parental-dashboard/`](parental-dashboard/) to Vercel's free tier. Estimated time: **~15 minutes**.

---

## Prerequisites

- [x] Repository pushed to GitHub: [`NamrataG7/SendWise`](https://github.com/NamrataG7/SendWise)
- [x] Vercel account: <https://vercel.com/namratag7s-projects>
- [x] A Supabase project (free tier is fine): <https://supabase.com/dashboard>

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

The dashboard stores anonymised violation counters and pairing state in Redis.

1. In your project, open the **Storage** tab
2. Click **Create Database** → choose **KV** (Upstash Redis, free tier)
3. Name it e.g. `sendwise-kv`
4. Click **Connect Project** → select the SendWise deployment → **Connect**

> [!NOTE]
> Vercel auto-injects `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`,
> `KV_REST_API_READ_ONLY_TOKEN`, and `REDIS_URL`. You do not need to copy
> them by hand.

- [ ] KV database created
- [ ] Attached to the SendWise project
- [ ] `REDIS_URL` visible under Settings → Environment Variables

---

## Step 4 — Configure Supabase and set env vars

Parent identity / sessions live in **Supabase Auth** — Redis stores only
violations, pairing codes, rate-limit counters, and the parent→children set.

### 4a. Create / open the Supabase project

1. Open the Supabase dashboard for your project.
2. **Authentication → Providers → Email**: ensure it is **enabled** (it is by
   default in new projects).
3. *(Optional — recommended for demo)*: turn **off** "Confirm email" so new
   `/signup` accounts can sign in immediately without clicking a link.
4. **Authentication → URL Configuration**: add your Vercel URL (e.g.
   `https://sendwise.vercel.app`) to **Site URL** and to the
   **Redirect URLs** allow-list (`https://sendwise.vercel.app/auth/callback`).
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable / anon key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 4b. Add the env vars in Vercel

Go to **Settings → Environment Variables** and add for **Production** (and
**Preview** if you want PR previews to work):

| Name                                    | Example / source                                       | Scope                |
| --------------------------------------- | ------------------------------------------------------ | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`              | `https://aqcggqeeccoqwdxdkawm.supabase.co`             | Production, Preview  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | `sb_publishable_…`                                     | Production, Preview  |
| `REDIS_URL` *(auto)*                    | `rediss://…`                                           | Production, Preview  |
| `SEED_TOKEN` *(dev only)*               | `openssl rand -hex 24`                                 | Preview (optional)   |

> [!NOTE]
> Vercel does **not** need `SUPABASE_SERVICE_ROLE_KEY` for normal dashboard
> operation. The app authenticates parents entirely via the publishable
> (anon) key + Supabase's cookie-based session. Only set the service role
> key if you intend to use `/api/dev/seed` with `parent_email` lookup.

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set
- [ ] `REDIS_URL` visible (auto from Step 3)

---

## Step 5 — Deploy

1. Return to the **Deployments** tab
2. Click **Redeploy** (or, if this is the first import, click **Deploy** on the initial screen)
3. Wait ~2 minutes for the build to complete
4. Visit the assigned URL and confirm the login page loads

- [ ] Build succeeded (green check)
- [ ] Login page renders at `https://sendwise.vercel.app`
- [ ] Click "Create one" → `/signup` → create a parent account
- [ ] Sign in → dashboard loads

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
| `/signup` shows "Email signups are disabled" | Email provider disabled in Supabase | Authentication → Providers → Email → toggle on |
| `/signup` succeeds but user can't log in until they check email | Email confirmation is on (default) | Either click the confirmation link, or disable "Confirm email" in Supabase for demos |
| `/auth/callback` redirects to `/login?error=auth_callback_failed` | Vercel URL not in Supabase Redirect URLs allow-list | Supabase → Authentication → URL Configuration → add `https://sendwise.vercel.app/auth/callback` |
| Login returns "Invalid login credentials" | Password mismatch / account not confirmed | Try `/signup` again, or reset password from Supabase dashboard |
| Dashboard loads but shows "Redis connection failed" | KV not attached to project | Storage tab → Connect Project |
| Android app can't reach API (`SSLPeerUnverifiedException`) | Cert pin mismatch after Vercel rotated certs | Repeat Step 6 and rebuild the APK |

---

<sub>Deployment complete. Return to [`README.md`](README.md) for the full project map.</sub>
