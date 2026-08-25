# SendWise

**Privacy-Preserving Parental Awareness of Adolescent Cyberbullying Risk**

[![Build APK](https://github.com/NamrataG7/SendWise/actions/workflows/build-apk.yml/badge.svg)](https://github.com/NamrataG7/SendWise/actions/workflows/build-apk.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Python](https://img.shields.io/badge/Python-3.12-3776AB)
![scikit-learn](https://img.shields.io/badge/sklearn-1.5.2-F7931E)
![Android](https://img.shields.io/badge/Android-API%2034-3DDC84)
![License](https://img.shields.io/badge/License-MIT-blue)

SendWise is a three-tier privacy-preserving system that helps parents stay aware of adolescent cyberbullying risk **without ever seeing message content**.

- **Tier 1 — Android Keyboard (IME)** analyzes outgoing text on-device with a Random Forest classifier. If risk is detected, a Fig 2 warning overlay appears *before* the message is sent. The child decides to Edit or Continue.
- **Tier 2 — Backend** (Vercel + Redis) accepts only behavioral metadata (`user_id_hash`, `timestamp`, `category`, `severity`, `action`, `session_id`). Message content **never** leaves the device.
- **Tier 3 — Parental Dashboard** (Next.js + Supabase) shows aggregated risk indicators to the linked parent — trend chart, category distribution, severity breakdown, edited-vs-sent ratio.

Reported metrics on the held-out test set: **Precision 85.96% · Recall 95.73% · F1 90.58%**.

---

## Table of Contents

1. [Live Deployment](#live-deployment)
2. [How It Works](#how-it-works)
3. [Getting Started (End-to-End)](#getting-started-end-to-end)
4. [Repository Structure](#repository-structure)
5. [Reproducibility](#reproducibility)
6. [Privacy Guarantees](#privacy-guarantees)
7. [Documentation](#documentation)
8. [Paper](#paper)
9. [License](#license)

---

## Live Deployment

- **Parent Dashboard:** https://sendwise-lac.vercel.app
- **APK downloads:** https://github.com/NamrataG7/SendWise/actions (latest run → Artifacts → `SendWise-debug-apk`)

---

## How It Works

```
Child (Redmi / Android)                       Parent (any browser)
─────────────────────                         ────────────────────
Types on any messenger
  ↓
SendWise Keyboard (IME)
  ↓
On-device Random Forest
(200 trees, TF-IDF, thr 0.5)
  ↓ if risk ≥ 0.5
Fig 2 warning overlay
  ↓
Child taps Edit / Continue
  ↓
Metadata POST (no text) ─── HTTPS ─── Vercel + Redis
                                             ↓
                                     Live dashboard updates
                                     (Fig 3: 4-chart insights,
                                      real-time incident feed)
```

---

## Getting Started (End-to-End)

Follow these steps in order to go from zero to a working parent-child pair.

### Step 1 — Parent: create your account

1. Open **https://sendwise-lac.vercel.app**
2. Click **"Create one"** under the login form
3. Sign up with your email + password
4. (If Supabase email confirmation is on) check your inbox and click the confirmation link
5. You are now logged in and land on the empty dashboard: **"No devices linked yet"**

### Step 2 — Child: get the APK

The APK is built automatically by GitHub Actions on every push to `main`.

1. Open **https://github.com/NamrataG7/SendWise/actions** in your browser
2. Click the most recent green ✅ workflow run titled **Build APK**
3. Scroll to the bottom of the run page → find the **Artifacts** section
4. Download **`SendWise-debug-apk`** (a `.zip`)
5. Unzip it to obtain `app-debug.apk`
6. Transfer to the child device (email to yourself, Google Drive, USB, or `adb install`)

### Step 3 — Child: install the APK on Android

Tested on Redmi Note 7 Pro (Android 10, MIUI 12). Similar phones follow the same steps.

1. On the phone, tap the transferred `app-debug.apk` file
2. When prompted "Install from unknown sources" — enable it for your file manager or browser
3. MIUI may show "This app was built for an older version" — tap **Install Anyway**
4. After install, open your app drawer → find **SafeKeyboard** — tap it once (opens `MainActivity`)

### Step 4 — Child: enable SafeKeyboard as the system keyboard

1. Go to **Settings → Additional settings → Languages & input → Manage keyboards**
2. Toggle **SafeKeyboard** on (Android will show a warning — this is expected for any IME; SendWise never leaves the device)
3. Swipe down the notification shade → tap the keyboard picker icon → select **SafeKeyboard**
4. Open any messenger (WhatsApp, SMS, Instagram DMs, etc.) — SendWise is now your active keyboard

### Step 5 — Child: generate a pairing code

1. Open the **SafeKeyboard** app icon from the app drawer
2. Tap **Settings** → **Parental Link**
3. Tap **"Generate Pairing Code"**
4. A large **6-digit code** appears (e.g. `847293`) with a **15-minute countdown**
5. Read the code out loud to the parent, or send it via any messenger

### Step 6 — Parent: enter the pairing code

1. On your dashboard **https://sendwise-lac.vercel.app**, click **"Link a Child Device"** (or navigate to `/pair`)
2. Enter the 6-digit code from the child device
3. (Optional) type a name for the child device
4. Click **Submit**
5. ✅ You see: "**1 device linked**". The dashboard is now bound to that child's `user_id_hash`.

### Step 7 — Try it out: trigger the warning overlay

1. On the child's phone, open any messenger with SafeKeyboard active
2. Type a risky message such as: `you are so stupid nobody likes you`
3. Hit **Send** (or **Enter**)
4. Before the message goes out, the **Fig 2 warning overlay** appears:
   - Pink hero band with red shield icon
   - Bold headline: "Potentially harmful language detected"
   - Category chip (e.g. *Harassment*), Severity chip (e.g. *Medium*)
   - Two buttons: **Edit Message** (outlined purple) and **Continue** (filled purple)
5. Tap **Edit Message** to revise your message, or **Continue** to send anyway
6. Metadata about the event (no text) is posted to the backend

### Step 8 — Parent: see the incident on the dashboard

1. Refresh **https://sendwise-lac.vercel.app**
2. Stats tile updates: **PREVENTED** goes up (if child tapped Edit) or **TOTAL** goes up (if Continued)
3. New incident card appears in the feed: category, severity, action, recommendation, and the redaction notice *"Message content is private and never leaves the child's device"*
4. Click **"View Fig 3 Insights →"** at the top right for the 4-chart aggregated view (30-day trend, category distribution, severity distribution, edited-vs-sent ratio)

---

## Repository Structure

```
SendWise/
├── SafeKeyboardApp/          # Android IME (Kotlin)
│   ├── app/src/main/
│   │   ├── java/com/safekeyboard/
│   │   │   ├── ime/          # SafeKeyboardIME, SendIntentDetector, SuggestionStripView
│   │   │   ├── nlp/          # RandomForestTextClassifier, ToxicityAnalyzer
│   │   │   ├── network/      # Retrofit, ViolationLogger, PairingApiService
│   │   │   ├── ui/           # WarningOverlayManager (Fig 2), PairingActivity
│   │   │   └── utils/        # UserIdGenerator (Keystore-backed salt)
│   │   ├── res/              # layouts, drawables, colors (light + night)
│   │   └── assets/models/    # sendwise_rf_v1.json.gz + sendwise_category_v1.json.gz
│   └── build.gradle
│
├── parental-dashboard/       # Next.js 14 web app
│   ├── app/                  # /, /login, /signup, /pair, /insights, /api/*
│   ├── components/           # StatsOverview, IncidentCard, insights charts
│   ├── lib/                  # Redis, Supabase, insights aggregation
│   ├── utils/supabase/       # server / client / middleware helpers
│   └── package.json
│
├── model_training/           # Python 3.12 + scikit-learn 1.5.2
│   ├── data/
│   │   ├── SendWise_Dataset.csv      # 20,122 rows
│   │   └── DATASET_CARD.md           # provenance (paper Table X)
│   ├── train_sendwise_rf.py          # reproduces paper Tables III/XIII
│   ├── export_to_kotlin_json.py      # sklearn → gzipped JSON for Kotlin loader
│   └── training_report.md            # metrics report
│
├── shared/detection-library/ # Auxiliary JS detectors (legacy)
├── .github/workflows/        # APK build + dashboard typecheck + reproduce-model
├── README.md                 # ← you are here
├── DOCS_ARCHIVE.md           # Consolidated secondary docs
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

---

## Reproducibility

Any reviewer can reproduce the paper's metrics with three commands:

```bash
git clone https://github.com/NamrataG7/SendWise.git
cd SendWise/model_training
pip install -r requirements.txt
python train_sendwise_rf.py
```

Expected output (matches paper Table XIII exactly):

| Metric      | Value    | Paper    |
|-------------|----------|----------|
| Precision   | 85.96%   | 85.96%   |
| Recall      | 95.73%   | 95.73%   |
| F1          | 90.58%   | 90.58%   |
| ROC-AUC     | 99.82%   | 99.82%   |

The trained model is exported to `SafeKeyboardApp/app/src/main/assets/models/sendwise_rf_v1.json.gz` in a format loadable by the Kotlin on-device inference engine (`nlp/RandomForestTextClassifier.kt`) with bit-exact parity to sklearn (max |Δ probability| = 0.00 on held-out samples).

---

## Privacy Guarantees

The paper claims message content **never leaves the child's device**. This is enforced at every layer:

| Layer | Enforcement |
|---|---|
| **Android buffer** | 500-char RAM buffer, cleared immediately after inference |
| **Network payload** | `ViolationLogger.kt` never includes text/message/content fields |
| **Server ingest** | `/api/violations` route rejects payloads containing `text`, `message`, or `content` fields (`schema.ts` + explicit guard) |
| **Server storage** | Only metadata stored in Redis: `user_id_hash`, `timestamp`, `category`, `severity`, `action`, `session_id` |
| **Dashboard UI** | `IncidentCard.tsx` never renders any text; shows a shield-icon redaction notice |
| **Transport** | HTTPS + TLS 1.3 preferred (with 1.2 fallback), certificate pinning ready |
| **Identity** | `user_id_hash = SHA-256(Android_ID + per-device Keystore-backed random salt)` — salt is not compiled in and never leaves the device |

---

## Documentation

- **[DOCS_ARCHIVE.md](./DOCS_ARCHIVE.md)** — consolidated secondary docs:
  - Build APK
  - Install on Redmi
  - Vercel Deployment
  - Certificate Pinning
  - Integration Test Guide
  - Design Spec from Paper
  - Paper Alignment Review
  - Paper Updates Needed
  - Model Training
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — how to contribute
- **[SECURITY.md](./SECURITY.md)** — vulnerability disclosure policy
- **[LICENSE](./LICENSE)** — MIT (dataset under CC-BY 4.0)

---

## Paper

**Monitoring Without Surveillance: A Privacy-Preserving Architecture for Parental Awareness of Adolescent Cyberbullying Risk**

Authors: Namrata Gaikwad, Sharada Ohatkar (MKSSS's Cummins College of Engineering for Women, Pune)

BibTeX:

```bibtex
@article{gaikwad2026sendwise,
  title   = {Monitoring Without Surveillance: A Privacy-Preserving Architecture
             for Parental Awareness of Adolescent Cyberbullying Risk},
  author  = {Gaikwad, Namrata and Ohatkar, Sharada},
  journal = {ETASR},
  year    = {2026},
  note    = {\url{https://github.com/NamrataG7/SendWise}}
}
```

---

## License

MIT. See [LICENSE](./LICENSE) for full terms. The training dataset in `model_training/data/` is released under CC-BY 4.0 with attribution to the SendWise paper.
