# SendWise Parental Dashboard

**Version**: 1.0.0
**Last Updated**: January 28, 2026

Comprehensive child safety monitoring dashboard for parents.

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
