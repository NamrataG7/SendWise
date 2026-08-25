# SendWise Parental Dashboard

**Version**: 1.0.0
**Last Updated**: January 28, 2026

Comprehensive child safety monitoring dashboard for parents.

---

## 🌐 API Endpoints

The dashboard ships with a Next.js App Router API layer that ingests **metadata only**
from the Android IME (never message content) and serves aggregated insights.

### Environment Variables

| Variable                              | Required | Description                                                                 |
|---------------------------------------|----------|-----------------------------------------------------------------------------|
| `REDIS_URL`                           | No*      | Redis connection string. If unset, falls back to an in-memory stub (dev).   |
| `NEXT_PUBLIC_SUPABASE_URL`            | Yes      | Supabase project URL. Baked into the browser bundle.                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| Yes      | Supabase publishable (anon) key. Baked into the browser bundle.             |
| `SEED_TOKEN`                          | Yes (dev)| Shared secret for `/api/dev/seed`.                                          |
| `ALLOW_SEED`                          | No       | Set to `true` in prod to enable `/api/dev/seed`. Otherwise 404 in prod.     |
| `SUPABASE_SERVICE_ROLE_KEY`           | No       | Optional. Only needed if `/api/dev/seed` should resolve `parent_email`.     |

\*Required in production. Use Vercel KV or Upstash Redis. See `.env.example`.

---

## 🔐 Authentication

The dashboard uses **Supabase Auth** (multi-parent, email + password). Sessions
are stored as HTTP-only cookies and refreshed on every request by the root
middleware via `@supabase/ssr`.

Redis is **not** used for parent identity — only for violations, pairing codes,
rate-limit counters, and the `parent:{user.id}:children` set.

### Setup

1. In your Supabase project dashboard, ensure the **Email** provider is enabled
   (Authentication → Providers). It is on by default in new projects.
2. For a smoother demo, you may want to turn **off** "Confirm email"
   (Authentication → Providers → Email) — otherwise `/signup` will require the
   user to click a confirmation link before they can sign in.
3. Copy `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project
   settings (API section).
4. Start the dashboard and visit `/signup` to create your first parent
   account, then `/login` to sign in.

### /signup flow

- Visit `/signup`, enter email + password (min 8 chars).
- The client calls `supabase.auth.signUp` with `emailRedirectTo` pointing at
  `/auth/callback`.
- If email confirmation is enabled, the user sees a "check your inbox" message.
  The confirmation link takes them to `/auth/callback?code=…` which exchanges
  the code for a session cookie and redirects to `/`.
- If email confirmation is disabled, the user is signed in immediately.

### Protected routes

Middleware (`middleware.ts`) enforces auth on:

- `/` (incident feed)
- `/insights/*`
- `/pair`
- `GET /api/violations/[user_id_hash]`
- `GET /api/insights/[user_id_hash]`
- `GET /api/parent/*`
- `POST /api/pairing/redeem`

Unauthenticated requests to pages are redirected to `/login?callbackUrl=…`.
API requests receive `401 { error: "Unauthorized" }`.

### Always public

- `/login`, `/signup`, `/auth/callback`, `/privacy`, `/terms`
- `/api/pairing/generate` and `POST /api/violations` (device → server)
- `/api/dev/*` (token-gated; 404 in prod unless `ALLOW_SEED=true`)

### Pairing a child device

Once signed in, visit `/pair`, enter the 6-digit code shown in the SendWise
keyboard on the child device, and optionally give the child a display name.
The redeem call uses the signed-in parent's Supabase UUID as `parent_id` —
it is derived server-side from the session cookie and cannot be forged in
the request body.

### Endpoints

| Method | Path                                    | Purpose                                                                 |
|--------|-----------------------------------------|-------------------------------------------------------------------------|
| POST   | `/api/violations`                       | IME ingest. Metadata only. Rate-limited 100/hr per `user_id_hash`.      |
| GET    | `/api/violations/[user_id_hash]`        | List violations for a child (parent auth in Phase 2).                   |
| POST   | `/api/pairing/generate`                 | Generate 6-digit pairing code (15 min TTL) for a `user_id_hash`.        |
| POST   | `/api/pairing/redeem`                   | Redeem code → link child to `parent_id`. One-time use.                  |
| GET    | `/api/insights/[user_id_hash]`          | Aggregated dashboard payload (30-day trend, category/severity, actions).|

### Privacy Guard

`POST /api/violations` **rejects** any payload containing `text`, `message`, or
`content` fields. Only sanitized metadata (category, severity, action, timestamp,
session_id, user_id_hash) is accepted or stored.

### Ingest Payload Shape

```json
{
  "user_id_hash": "<64 hex chars, SHA-256>",
  "timestamp": "2026-01-28T10:15:30Z",
  "category": "harassment | threats | hate_speech | sexual_content | self_harm",
  "severity": "low | medium | high",
  "action": "edited | sent_anyway | blocked | cancelled",
  "session_id": "<opaque session id>"
}
```

---

## 🎯 Features

### **Multi-Category Safety Monitoring**

1. **🚨 Self-Harm Detection**
   - Immediate suicide threats (URGENT)
   - Suicidal ideation (CRITICAL)
   - Self-injury references (HIGH)
   - Depression indicators (MEDIUM)
   - Crisis resources: 988 Suicide Hotline, Crisis Text Line

2. **🔒 Privacy Risk Detection**
   - Phone numbers
   - Email addresses
   - Physical addresses (CRITICAL)
   - School names
   - SSN/Credit card numbers (CRITICAL)

3. **👤 Meeting Stranger Detection**
   - Agreement to meet online contacts
   - Location sharing
   - Sneaking out plans (CRITICAL)
   - Hiding from parents (CRITICAL)
   - Vehicle arrangements (kidnapping risk)

4. **⚠️ Risky Behavior Detection**
   - Drug use/purchase
   - Underage alcohol consumption
   - Sexual content (minors) - CRITICAL
   - Illegal activities
   - Dangerous challenges

5. **🛡️ Cyberbullying Detection**
   - Harassment
   - Hate speech
   - Threats
   - Sexual harassment

---

## 📊 Dashboard Features

### **Stats Overview**
- 🚨 Critical incidents counter
- ⚠️ High priority incidents
- ✅ Messages prevented
- 📊 Total incidents (last 7 days)

### **Incident Cards**
- Severity-based color coding
- Platform indicators
- Detected content (sanitized)
- Action taken (blocked/edited/sent anyway)
- Parent recommendations
- Crisis resources (when needed)
- Action buttons (View Context, Get Help, Mark Reviewed)

### **Category Filtering**
- Toggle between safety categories
- Real-time filtering
- Shows incident counts

### **Export Reports**
- CSV export functionality
- Includes all incident details
- Shareable with counselors/therapists
- Date-stamped filenames

---

## 🚀 Getting Started

### Installation

```bash
cd parental-dashboard
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## 🎨 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks

---

## 📂 Project Structure

```
parental-dashboard/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Main dashboard page
│   └── globals.css          # Global styles
│
├── components/
│   ├── IncidentCard.tsx     # Incident display card
│   ├── StatsOverview.tsx    # Stats dashboard
│   └── CategoryFilter.tsx   # Category filter controls
│
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   └── sample-data.ts       # Sample incidents for testing
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🔧 Integration with Detection Library

The dashboard uses the shared detection library for analysis:

```typescript
import {
  PrivacyDetector,
  SelfHarmDetector,
  RiskyBehaviorDetector,
  MeetingDetector,
  ToxicityAnalyzer
} from '../shared/detection-library';

// Analyze message
const privacyResult = PrivacyDetector.analyze(messageText);
const selfHarmResult = SelfHarmDetector.analyze(messageText);
const riskyResult = RiskyBehaviorDetector.analyze(messageText);
const meetingResult = MeetingDetector.analyze(messageText);
const bullyingResult = ToxicityAnalyzer.analyze(messageText, 0.5);

// Get parent notification
const notification = SelfHarmDetector.getParentNotification(selfHarmResult);
```

---

## 🎯 Sample Data

The dashboard includes realistic sample data for testing:

- **8 sample incidents** covering all categories
- Severity levels: URGENT, CRITICAL, HIGH, MEDIUM
- Different platforms: Instagram, WhatsApp, Discord, Snapchat, TikTok
- Various actions: Blocked, Edited, Sent Anyway
- Crisis resources and recommendations

---

## 🚨 Severity Levels

| Level | Color | Icon | Action Required |
|-------|-------|------|-----------------|
| **URGENT** | Red | 🚨 | Contact 911/988 immediately |
| **CRITICAL** | Orange | 🚨 | Immediate intervention |
| **HIGH** | Yellow | ⚠️ | Talk within 24-48 hours |
| **MEDIUM** | Yellow (light) | ⚠️ | Monitor and discuss |
| **LOW** | Green | ℹ️ | Keep monitoring |

---

## 🎨 UI Features

### Responsive Design
- Mobile-friendly layout
- Tablet optimized
- Desktop full-featured

### Color Coding
- **Red**: Urgent/Critical (self-harm, meeting strangers)
- **Orange**: Critical (privacy risks)
- **Yellow**: High/Medium priority
- **Green**: Messages prevented
- **Blue**: Informational

### Interactive Elements
- Category filter toggles
- Export report button
- Action buttons on each incident
- Responsive hover states

---

## 📥 Export Report Format

CSV includes:
- Timestamp
- Platform
- Category
- Severity
- Detected content
- Action taken
- Parent recommendation

Example filename: `sendwise-report-2026-01-28.csv`

---

## 🔐 Privacy & Security

### What's Stored:
- Incident metadata (timestamp, platform, category, severity)
- Sanitized/partial message text (never full content)
- Action taken (blocked/edited/sent)
- Recommendations for parents

### What's NOT Stored:
- Full message content
- Child's actual typed text
- Recipient information
- Conversation context

---

## 🎓 Use Cases

1. **Daily Monitoring**: Parents check dashboard daily for incidents
2. **Crisis Response**: Immediate alerts for urgent self-harm threats
3. **Therapy Support**: Export reports for counselors/therapists
4. **School Collaboration**: Share relevant incidents with school counselors
5. **Trend Analysis**: Monitor patterns over time

---

## 🛠️ Future Enhancements

- [ ] Real-time push notifications
- [ ] Mobile app (React Native)
- [ ] Multi-child support
- [ ] Weekly/monthly email summaries
- [ ] Integration with counseling resources
- [ ] Machine learning insights
- [ ] Trend analysis charts
- [ ] Comparative age-group statistics

---

## 📞 Support Resources

### Crisis Hotlines (Built Into Dashboard):
- **988 Suicide & Crisis Lifeline**: Call or text 988
- **Crisis Text Line**: Text HOME to 741741
- **NCMEC CyberTipline**: 1-800-843-5678 (predator reporting)

### Additional Resources:
- National Suicide Prevention Lifeline
- SAMHSA National Helpline (substance abuse)
- National Center for Missing & Exploited Children

---

## 🧪 Testing

### Test with Sample Data:
```bash
npm run dev
```

Navigate to `localhost:3000` and you'll see:
- 3 critical incidents (self-harm, harassment, threats)
- 5 other incidents (hate speech, sexual content, harassment)
- Stats overview with realistic numbers
- All category filters working

### Test Export:
1. Click "📥 Export Report"
2. CSV file downloads with all incidents
3. Open in Excel/Google Sheets

---

## 🚀 Deployment

### Vercel (Recommended):
```bash
npm install -g vercel
vercel
```

### Other Platforms:
- **Netlify**: Connect GitHub repo
- **AWS Amplify**: Deploy from Git
- **Self-hosted**: `npm run build && npm start`

---

## 📄 License

See root LICENSE file

---

## 🤝 Contributing

This dashboard is part of the SendWise child safety platform.

For issues or features:
- GitHub Issues
- Email support

---

**Built with love to keep kids safe online.** 💙

---

## Quick Links

- [Shared Detection Library](../shared/detection-library/README.md)
- [Integration Guide](../shared/INTEGRATION_GUIDE.md)
- [Legal Docs](../LEGAL_COMPLIANCE.md)
