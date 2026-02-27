const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePassword } = require('../utils/passwordValidator');
const { auditLog } = require('../utils/auditLogger');

const router = express.Router();

// GET /api/users — admin only
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE deleted = false ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/role — change user role
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
  const { role } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND deleted = false RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    
    await auditLog('user_role_changed', req.user.id, 'users', req.params.id, { old_role: 'N/A', new_role: role }, ipAddress);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/status — toggle active status
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, is_active',
      [is_active, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET deleted = true, updated_at = NOW() WHERE id = $1 AND deleted = false RETURNING id, name, email',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    
    await auditLog('user_deleted', req.user.id, 'users', req.params.id, { name: result.rows[0].name, email: result.rows[0].email }, ipAddress);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password — reset password
router.put('/:id/password', authenticate, requireAdmin, async (req, res) => {
  const { password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Validate password strength
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) {
    return res.status(400).json({ error: 'Password too weak', details: pwValidation.errors });
  }
  
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2 AND deleted = false RETURNING id, name, email',
      [hash, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    
    await auditLog('user_password_reset', req.user.id, 'users', req.params.id, { name: result.rows[0].name }, ipAddress);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
