const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, status)
       VALUES ($1, $2, $3, 'Unverified')
       RETURNING id, name, email, status, last_login`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const user  = rows[0];
    const token = signToken(user.id);

    return res.status(201).json({ token, user });
  } catch (err) {
    // PostgreSQL unique-constraint violation on uidx_user_email
    if (err.code === '23505') {
      return res.status(400).json({ message: 'This email is already taken.' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (user.status === 'Blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update last_login timestamp.
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = signToken(user.id);
    const { password: _pw, ...safeUser } = user;
    safeUser.last_login = new Date().toISOString();

    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

module.exports = { register, login };
