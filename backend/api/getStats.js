/**
 * getStats API Endpoint
 *
 * Optional endpoint for querying user statistics
 * (For authorized access only - e.g., research, moderation)
 *
 * GET /api/getStats?user_id_hash={hash}
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { user_id_hash } = req.query;

    if (!user_id_hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing user_id_hash parameter'
      });
    }

    // Validate hash format
    if (!/^[a-f0-9]{64}$/.test(user_id_hash)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id_hash format'
      });
    }

    const countKey = `user:${user_id_hash}:count`;
    const categoryKey = `user:${user_id_hash}:last_category`;
    const historyKey = `user:${user_id_hash}:history`;

    const count = await kv.get(countKey) || 0;
    const lastCategory = await kv.get(categoryKey) || 'none';
    const history = await kv.get(historyKey) || [];

    return res.status(200).json({
      success: true,
      user_id_hash,
      count,
      last_category: lastCategory,
      history_count: history.length,
      recent_history: history.slice(-10) // Last 10 entries
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
