const pool = require('../db/pool');

// GET /api/users  – sorted by last_login DESC (NULLs last)
async function getUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, status, last_login, created_at
       FROM users
       ORDER BY last_login DESC NULLS LAST, created_at DESC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// PATCH /api/users/block  – body: { ids: [1, 2, ...] }
async function blockUsers(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array is required.' });
  }

  try {
    await pool.query(
      `UPDATE users SET status = 'Blocked' WHERE id = ANY($1::int[])`,
      [ids]
    );
    return res.status(200).json({ message: 'Users blocked.' });
  } catch (err) {
    console.error('blockUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// PATCH /api/users/unblock  – body: { ids: [1, 2, ...] }
async function unblockUsers(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array is required.' });
  }

  try {
    await pool.query(
      `UPDATE users SET status = 'Active' WHERE id = ANY($1::int[])`,
      [ids]
    );
    return res.status(200).json({ message: 'Users unblocked.' });
  } catch (err) {
    console.error('unblockUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// DELETE /api/users  – body: { ids: [1, 2, ...] }
async function deleteUsers(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array is required.' });
  }

  try {
    await pool.query(
      `DELETE FROM users WHERE id = ANY($1::int[])`,
      [ids]
    );
    return res.status(200).json({ message: 'Users deleted.' });
  } catch (err) {
    console.error('deleteUsers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// PATCH /api/users/:id/verify  – mock email verification
async function verifyUser(req, res) {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      `UPDATE users SET status = 'Active'
       WHERE id = $1 AND status = 'Unverified'`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(400).json({ message: 'User not found or already verified.' });
    }

    return res.status(200).json({ message: 'Email verified.' });
  } catch (err) {
    console.error('verifyUser error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { getUsers, blockUsers, unblockUsers, deleteUsers, verifyUser };
