# SendWise Parental Dashboard

**Version**: 1.0.0
**Last Updated**: January 28, 2026

Comprehensive child safety monitoring dashboard for parents.

---

## 🌐 API Endpoints

The dashboard ships with a Next.js App Router API layer that ingests **metadata only**
from the Android IME (never message content) and serves aggregated insights.

### Environment Variables

| Variable               | Required | Description                                                                 |
|------------------------|----------|-----------------------------------------------------------------------------|
| `REDIS_URL`            | No*      | Redis connection string. If unset, falls back to an in-memory stub (dev).   |
| `NEXTAUTH_SECRET`      | Yes      | Random secret for NextAuth JWT signing. Generate: `openssl rand -base64 32`.|
| `NEXTAUTH_URL`         | Yes      | Public base URL of the dashboard (e.g. `http://localhost:3000`).            |
| `PARENT_EMAIL`         | Yes      | The single parent account email (case-insensitive at login).                |
| `PARENT_PASSWORD_HASH` | Yes      | bcrypt hash of the parent password.                                         |

\*Required in production. Use Vercel KV or Upstash Redis. See `.env.example`.

---

## 🔐 Authentication

The dashboard uses **NextAuth (Credentials provider)** with a single env-based
parent account. Session strategy is **JWT with a 24-hour max age**.

### Setup

1. Choose a password and generate a bcrypt hash:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
   ```
2. Populate `.env.local`:
   ```
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=http://localhost:3000
   PARENT_EMAIL=parent@example.com
   PARENT_PASSWORD_HASH='<paste bcrypt hash here>'
   ```
3. Start the dashboard and visit `/login`.

### Protected routes

Middleware (`middleware.ts`) enforces auth on:

- `/` (incident feed)
- `/insights/*`
- `/pair`
- `GET /api/violations/*`
- `GET /api/insights/*`

Unauthenticated requests to pages are redirected to `/login?callbackUrl=…`.
API requests receive `401 { error: "Unauthorized" }`.

### Always public

- `/login`, `/privacy`, `/terms`
- `/api/auth/*` (NextAuth endpoints)
- `/api/pairing/generate` and `/api/pairing/redeem`
- `POST /api/violations` — device → server ingest, unauthenticated by design
  (protected by the payload privacy guard, not by user auth)

### Pairing a child device

Once signed in, visit `/pair`, enter the 6-digit code shown in the SendWise
keyboard on the child device, and optionally give the child a display name.
The redeem call uses the signed-in parent's email as `parent_id`.

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
  "category": "self_harm | privacy_risk | risky_behavior | meeting_stranger | cyberbullying",
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
- 3 critical incidents (self-harm, privacy, meeting stranger)
- 5 other incidents (risky behavior, cyberbullying)
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
