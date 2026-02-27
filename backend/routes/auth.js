import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { validateEmail, validateName } from '../utils/validator.js';
import { auditLog } from '../utils/auditLogger.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true AND deleted = false',
      [email]
    );
    
    if (result.rows.length === 0) {
      await auditLog('login_failed', null, 'users', null, { email, reason: 'user_not_found' }, ipAddress, 'failure');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      await auditLog('login_failed', user.id, 'users', user.id, { reason: 'account_locked', minutesLeft }, ipAddress, 'failure');
      return res.status(429).json({ 
        error: `Account locked. Please try again in ${minutesLeft} minutes.` 
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const newAttempts = user.failed_login_attempts + 1;
      let updateData = { failed_login_attempts: newAttempts };
      
      // Lock account if max attempts reached
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION);
        await auditLog('login_failed', user.id, 'users', user.id, { reason: 'max_attempts_exceeded' }, ipAddress, 'failure');
        
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, updateData.locked_until, user.id]
        );
        
        return res.status(429).json({ 
          error: 'Too many failed login attempts. Account locked for 15 minutes.' 
        });
      }
      
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
        [newAttempts, user.id]
      );
      
      await auditLog('login_failed', user.id, 'users', user.id, { reason: 'invalid_password', attempts: newAttempts }, ipAddress, 'failure');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLog('login_success', user.id, 'users', user.id, { email }, ipAddress);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    await auditLog('login_error', null, 'users', null, { error: err.message }, ipAddress, 'failure');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only in production — open for setup)
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'staff' } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Validate name
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validate password strength
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) {
    return res.status(400).json({ error: 'Password too weak', details: pwValidation.errors });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hash, role]
    );
    
    await auditLog('user_created', null, 'users', result.rows[0].id, { name, email, role }, ipAddress);
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      await auditLog('user_register_failed', null, 'users', null, { email, reason: 'email_exists' }, ipAddress, 'failure');
      return res.status(409).json({ error: 'Email already exists' });
    }
    await auditLog('user_register_failed', null, 'users', null, { email, error: err.message }, ipAddress, 'failure');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — Get current authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted = false',
      [req.user.id]
    );
    
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — Logout (token invalidation)
router.post('/logout', authenticate, async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // In a production system, you would:
    // 1. Add token to blacklist in Redis
    // 2. Clear any server-side session data
    // For now, we just log the logout action
    
    await auditLog('logout', req.user.id, 'users', req.user.id, {}, ipAddress);
    
    res.json({ 
      message: 'Logged out successfully',
      instruction: 'Clear token from localStorage'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password — Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND deleted = false',
      [email]
    );
    
    // Always return success (security: don't reveal if email exists)
    if (!result.rows.length) {
      await auditLog('password_reset_requested', null, 'users', null, { email, reason: 'user_not_found' }, ipAddress);
      return res.json({ message: 'If email exists, a reset link has been sent' });
    }

    const user = result.rows[0];
    
    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
    
    // Store reset token in database (you'll need to add these columns to users table)
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetTokenHash, resetTokenExpiry, user.id]
    );
    
    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.name);
    
    if (emailResult.success) {
      await auditLog('password_reset_requested', user.id, 'users', user.id, { email }, ipAddress);
      res.json({ message: 'If email exists, a reset link has been sent' });
    } else {
      await auditLog('password_reset_failed', user.id, 'users', user.id, { reason: 'email_send_failed' }, ipAddress, 'failure');
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }
  } catch (err) {
    console.error('Password reset error:', err);
    await auditLog('password_reset_error', null, 'users', null, { error: err.message }, ipAddress, 'failure');
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/reset-password — Reset password with token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password required' });
  }

  // Validate password strength
  const pwValidation = validatePassword(newPassword);
  if (!pwValidation.valid) {
    return res.status(400).json({ error: 'Password too weak', details: pwValidation.errors });
  }

  try {
    // Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid reset token
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW() AND deleted = false',
      [tokenHash]
    );
    
    if (!result.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, failed_login_attempts = 0, locked_until = NULL WHERE id = $2',
      [hash, user.id]
    );
    
    await auditLog('password_reset_completed', user.id, 'users', user.id, { email: user.email }, ipAddress);
    
    res.json({ 
      message: 'Password reset successfully. You can now login with your new password.' 
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

export default router;
