# SafeKeyboard Backend

Vercel serverless backend for logging violation metadata.

## Quick Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
npm install
vercel --prod
```

## Setup Vercel KV

1. Go to https://vercel.com/dashboard/stores
2. Click "Create Database" → "KV"
3. Name: `safekeyboard-kv`
4. Click "Create"
5. Copy the environment variables
6. Add them to your Vercel project
7. Redeploy: `vercel --prod`

## API Endpoints

### POST /api/logViolation
Logs violation metadata (no message content).

**Request:**
```json
{
  "user_id_hash": "string (64 hex chars)",
  "category": "harassment | hate | threat | sexual",
  "severity": "low | medium | high",
  "action": "sent_anyway | warning_only | edited"
}
```

**Response:**
```json
{
  "success": true,
  "current_count": 15,
  "escalation_flag": true,
  "escalation_level": "strong_warning"
}
```

### GET /api/getStats
Query user statistics.

**Request:**
```
GET /api/getStats?user_id_hash={hash}
```

**Response:**
```json
{
  "success": true,
  "user_id_hash": "abc123...",
  "count": 15,
  "last_category": "harassment",
  "history_count": 50,
  "recent_history": [...]
}
```

## Test

```bash
curl -X POST https://your-deployment.vercel.app/api/logViolation \
  -H "Content-Type: application/json" \
  -d '{
    "user_id_hash": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "category": "harassment",
    "severity": "medium",
    "action": "sent_anyway"
  }'
```

## Environment Variables

Create `.env` file (use `.env.example` as template):

```
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_token
KV_REST_API_READ_ONLY_TOKEN=your_read_only_token
```

## Privacy Guarantees

✅ NO message content logged
✅ NO recipient information
✅ NO app names
✅ ONLY anonymous metadata
✅ 90-day auto-expiration
