# SafeKeyboard - Cyberbullying Prevention System

An Android keyboard (IME) that prevents cyberbullying and harassment through pre-send intervention while maintaining strict privacy standards.

## 🎯 Project Overview

This project implements a **behavioral intervention system** that:

- ✅ Runs entirely inside a custom Android keyboard (IME)
- ✅ Detects full-message intent, not isolated words
- ✅ Interrupts the user **before** they press Send
- ✅ Gives user choice, not enforcement
- ✅ Logs only violation counts, **never message content**
- ✅ Fully compliant with platform and privacy constraints
- ✅ Built 100% on free tiers (Vercel)

## 🔒 Privacy-First Architecture

### What This System Does:
- Analyzes messages **on-device only**
- Detects harmful intent using local NLP
- Shows intervention popup before sending
- Logs **anonymous metadata** only (if user chooses "Send Anyway")

### What This System NEVER Does:
- ❌ Upload message text
- ❌ Store message content
- ❌ Track real identities
- ❌ Access Send button directly
- ❌ Modify social media apps
- ❌ Perform cloud-based message scanning

## 📁 Project Structure

```
Phd_Keyboard/
├── SafeKeyboardApp/          # Android Application
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/safekeyboard/
│   │   │   │   ├── ime/          # Keyboard IME service
│   │   │   │   ├── nlp/          # On-device toxicity analysis
│   │   │   │   ├── ui/           # User interface components
│   │   │   │   ├── network/      # API communication
│   │   │   │   └── utils/        # Utilities (preferences, user ID)
│   │   │   ├── res/              # Resources (layouts, strings, etc.)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── settings.gradle
│
├── backend/                    # Vercel Serverless Backend
│   ├── api/
│   │   ├── logViolation.js    # Main API endpoint
│   │   └── getStats.js        # Statistics endpoint
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
└── README.md                   # This file
```

## 🚀 Quick Start

### Android App

1. **Open in Android Studio**
   ```bash
   cd SafeKeyboardApp
   # Open this directory in Android Studio
   ```

2. **Update Backend URL**
   Edit `SafeKeyboardApp/app/src/main/java/com/safekeyboard/network/RetrofitClient.kt`:
   ```kotlin
   private const val BASE_URL = "https://your-app.vercel.app"
   ```

3. **Build and Run**
   - Connect Android device or start emulator (API 26+)
   - Click Run in Android Studio
   - Enable SafeKeyboard in device settings

### Backend (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to backend directory**
   ```bash
   cd backend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create Vercel KV Store**
   - Go to https://vercel.com/dashboard/stores
   - Create a new KV (Redis) database
   - Copy the environment variables

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your KV credentials
   ```

6. **Deploy**
   ```bash
   vercel --prod
   ```

## 🏗️ System Components

### 1. Android Keyboard (IME)
- **File**: `SafeKeyboardIME.kt`
- Captures user input
- Maintains message buffer
- Detects send intent
- Triggers analysis and intervention

### 2. Message Buffer
- **File**: `MessageBuffer.kt`
- Maintains full message context (max 500 chars)
- Never persisted to disk
- Cleared on app switch or send completion

### 3. Send Intent Detector
- **File**: `SendIntentDetector.kt`
- Multi-signal scoring system:
  - Enter key press (60% weight)
  - Keyboard hidden (50% weight)
  - Typing pause >1.5s (30% weight)
  - Cursor moved away (20% weight)
  - Chat app context (20% weight)

### 4. On-Device NLP Analyzer
- **File**: `ToxicityAnalyzer.kt`
- **Phase 1**: Rule-based + lexicon + regex
- Categories: harassment, hate, threat, sexual
- Severity levels: low, medium, high
- **Phase 2** (Future): TensorFlow Lite with DistilBERT

### 5. Warning Overlay
- **File**: `WarningOverlayManager.kt`
- System overlay (requires permission)
- Emotionally neutral messaging
- Two options: Edit or Send Anyway

### 6. Privacy-Preserving User ID
- **File**: `UserIdGenerator.kt`
- SHA-256(AndroidID + AppSalt)
- One-way, non-reversible
- Stable per device
- No PII, no login required

### 7. Violation Logger
- **File**: `ViolationLogger.kt`
- Logs metadata only (never message content)
- Offline queue with retry
- Fire-and-forget pattern

### 8. Vercel Backend
- **Files**: `logViolation.js`, `getStats.js`
- Serverless functions
- Vercel KV (Redis) storage
- Counter and escalation logic

## 📊 Escalation Thresholds

| Count | Action |
|-------|--------|
| 5     | Soft warning |
| 10    | Strong warning |
| 20    | Platform moderation flag |
| 30    | Authority escalation (optional, jurisdiction-based) |

## 🔐 Identity Architecture

### Three Separate Identities:

1. **Keyboard User** (what your app knows)
   - Anonymous hash: SHA-256(AndroidID + Salt)
   - Violation count
   - Category history

2. **Platform User** (what WhatsApp/Instagram knows)
   - Account name
   - Messages
   - Recipients
   - IP address

3. **Real-world Person** (legal identity)
   - Name, phone, etc.
   - Revealed through legal process only

**Your app only touches #1. This is how you stay legal and effective.**

## 🧪 Testing

### Test the Keyboard
1. Enable SafeKeyboard in device settings
2. Open any chat app (WhatsApp, Messenger, etc.)
3. Type a message with harmful content
4. Wait for typing pause (1.5s) or press Enter
5. Verify warning popup appears

### Test Messages
Try these test phrases:
- "you're so stupid"
- "nobody likes you"
- "I'm going to hurt you"
- "send me nudes"

### Test Backend
```bash
curl -X POST https://your-app.vercel.app/api/logViolation \
  -H "Content-Type: application/json" \
  -d '{
    "user_id_hash": "abc123...",
    "category": "harassment",
    "severity": "medium",
    "action": "sent_anyway"
  }'
```

## 📱 Requirements

### Android App
- Min SDK: 26 (Android 8.0)
- Target SDK: 34 (Android 14)
- Kotlin 1.9.0+
- Android Studio Hedgehog or later

### Backend
- Node.js 18+
- Vercel account (free tier)
- Vercel KV database (free tier)

## 🔧 Configuration

### Sensitivity Threshold
Adjust in app settings (0.0 to 1.0):
- 0.3: High sensitivity (more warnings)
- 0.5: Medium sensitivity (default)
- 0.7: Low sensitivity (fewer warnings)

### Toxicity Lexicon
Edit in `ToxicityAnalyzer.kt`:
```kotlin
private val harassmentTerms = setOf(
    "term1", "term2", ...
)
```

## 📖 Research & Ethics

### What You Can Claim:
"Our system identifies repeat abusive behavior patterns at the device level, enabling early intervention and downstream investigation without violating user privacy."

### What You CANNOT Claim:
- ❌ "We identify cyber criminals"
- ❌ "We track users across platforms"
- ❌ "We report users to police automatically"
- ❌ "We store abusive messages"

## 🤝 Contributing

This is a research project for cyberbullying prevention. Contributions welcome for:
- Improved NLP models
- Better intent-to-send detection
- Additional language support
- Privacy-preserving analytics

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Important Notes

1. **Never log message content** - This is a hard constraint
2. **Fail open** - If analysis fails, allow the message
3. **Free infrastructure only** - Stay within Vercel free tier limits
4. **Privacy by design** - Every feature must respect privacy principles
5. **User choice always** - Never block sending, only warn

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Email: [your-email]
- Documentation: See individual README files in subdirectories

## 🎓 Academic Use

This project is designed to be:
- ✅ Publishable as IEEE paper
- ✅ Defensible to regulators
- ✅ Compliant with ethics committees
- ✅ Aligned with research best practices

---

**Built with privacy, ethics, and user empowerment at the core.**
