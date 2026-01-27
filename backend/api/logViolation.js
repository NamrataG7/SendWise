/**
 * logViolation API Endpoint
 *
 * Vercel Serverless Function for logging violation metadata
 *
 * STRICT API CONTRACT:
 * POST /api/logViolation
 * {
 *   "user_id_hash": "string",
 *   "category": "string",
 *   "severity": "string",
 *   "action": "sent_anyway | warning_only"
 * }
 *
 * ABSOLUTELY FORBIDDEN:
 * - Message text
 * - Recipient info
 * - App name
 * - IP storage
 *
 * STORAGE:
 * - Vercel KV (Redis)
 * - Key format: user:{hash}:count
 * - Key format: user:{hash}:last_category
 * - Key format: user:{hash}:history
 */

import { kv } from '@vercel/kv';

// Escalation thresholds
const ESCALATION_THRESHOLDS = {
  SOFT_WARNING: 5,
  STRONG_WARNING: 10,
  PLATFORM_FLAG: 20,
  AUTHORITY_ESCALATION: 30
};

// Action weights
const ACTION_WEIGHTS = {
  warning_only: 1,
  sent_anyway: 2,
  edited: -0.5
};

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Validate request body
    const { user_id_hash, category, severity, action } = req.body;

    if (!user_id_hash || !category || !severity || !action) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate user_id_hash format (SHA-256 = 64 hex chars)
    if (!isValidHash(user_id_hash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id_hash format'
      });
    }

    // Validate category
    const validCategories = ['harassment', 'hate', 'threat', 'sexual', 'none'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'none'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity'
      });
    }

    // Validate action
    const validActions = ['sent_anyway', 'warning_only', 'edited'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    // Process the violation
    const result = await processViolation(user_id_hash, category, severity, action);

    return res.status(200).json({
      success: true,
      current_count: result.count,
      escalation_flag: result.escalationFlag,
      escalation_level: result.escalationLevel
    });

  } catch (error) {
    console.error('Error processing violation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Processes a violation and updates counters
 */
async function processViolation(userId, category, severity, action) {
  const countKey = `user:${userId}:count`;
  const categoryKey = `user:${userId}:last_category`;
  const historyKey = `user:${userId}:history`;

  // Get current count
  let currentCount = await kv.get(countKey) || 0;

  // Update count based on action
  const weight = ACTION_WEIGHTS[action] || 0;
  currentCount += weight;

  // Ensure count doesn't go negative
  currentCount = Math.max(0, currentCount);

  // Update KV store
  await kv.set(countKey, currentCount);
  await kv.set(categoryKey, category);

  // Add to history (limited to last 100 entries)
  const historyEntry = {
    timestamp: Date.now(),
    category,
    severity,
    action,
    count: currentCount
  };

  // Get existing history
  const history = await kv.get(historyKey) || [];
  history.push(historyEntry);

  // Keep only last 100 entries
  const trimmedHistory = history.slice(-100);
  await kv.set(historyKey, trimmedHistory);

  // Set expiration (90 days)
  await kv.expire(countKey, 60 * 60 * 24 * 90);
  await kv.expire(categoryKey, 60 * 60 * 24 * 90);
  await kv.expire(historyKey, 60 * 60 * 24 * 90);

  // Check for escalation
  const escalation = checkEscalation(currentCount);

  return {
    count: currentCount,
    escalationFlag: escalation.flag,
    escalationLevel: escalation.level
  };
}

/**
 * Checks if escalation is needed based on count
 */
function checkEscalation(count) {
  if (count >= ESCALATION_THRESHOLDS.AUTHORITY_ESCALATION) {
    return {
      flag: true,
      level: 'authority_escalation'
    };
  } else if (count >= ESCALATION_THRESHOLDS.PLATFORM_FLAG) {
    return {
      flag: true,
      level: 'platform_moderation'
    };
  } else if (count >= ESCALATION_THRESHOLDS.STRONG_WARNING) {
    return {
      flag: true,
      level: 'strong_warning'
    };
  } else if (count >= ESCALATION_THRESHOLDS.SOFT_WARNING) {
    return {
      flag: true,
      level: 'soft_warning'
    };
  }

  return {
    flag: false,
    level: 'none'
  };
}

/**
 * Validates hash format (SHA-256 = 64 hex characters)
 */
function isValidHash(hash) {
  return /^[a-f0-9]{64}$/.test(hash);
}
