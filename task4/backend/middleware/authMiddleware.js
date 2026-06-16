/**
 * Centralized Auth Middleware
 *
 * Applied to every protected route. For each request it:
 *  1. Verifies the Bearer JWT.
 *  2. Queries the database to confirm the user still exists AND is not Blocked.
 *  3. If either check fails it returns 401 so the frontend can wipe auth state
 *     and redirect to /login – no WebSockets required.
 */
const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0) {
      // User was deleted since the token was issued.
      return res.status(401).json({ message: 'Account no longer exists.', kicked: true });
    }

    const user = rows[0];

    if (user.status === 'Blocked') {
      // User was blocked since the token was issued.
      return res.status(403).json({ message: 'Your account has been blocked.', kicked: true });
    }

    // Attach lightweight user info for downstream handlers.
    req.user = { id: user.id, status: user.status };
    next();
  } catch (err) {
    console.error('authMiddleware DB error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = authMiddleware;
