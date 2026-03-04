import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// POST /api/checkin/stage1 — Event Arrival
//   Body: { qr_code, event_id }
//   Validates that participant belongs to the selected event.
// ─────────────────────────────────────────────────────────
router.post('/stage1', authenticate, async (req, res) => {
  const { qr_code, event_id } = req.body;
  if (!qr_code)   return res.status(400).json({ error: 'QR code required' });
  if (!event_id)  return res.status(400).json({ error: 'event_id required — please select an event' });

  try {
    const pResult = await pool.query('SELECT * FROM participants WHERE qr_code = $1', [qr_code]);
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    if (p.event_id !== parseInt(event_id)) {
      return res.status(403).json({
        status: 'WRONG_EVENT',
        error: 'Participant is not registered for this event',
      });
    }

    if (p.checkin_at_1) {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'Already checked in for Event Arrival',
        participant: sanitize(p),
        checkin_at_1: p.checkin_at_1,
      });
    }

    const updated = await pool.query(
      `UPDATE participants SET checkin_at_1 = NOW(), is_checked_in = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [p.id]
    );

    res.json({
      status: 'SUCCESS',
      message: `Welcome, ${p.name}! Event Arrival confirmed.`,
      stage: 1,
      participant: sanitize(updated.rows[0]),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/checkin/stage2 — Venue Check-in (session entry/exit)
//   Body: { qr_code, session_id }
//
//   First scan  → records ENTRY  (guard_expires_at = +3 min)
//   Second scan within 3 min → COOLDOWN_ACTIVE (no record written)
//   Second scan after 3 min  → records EXIT with duration
//   Already exited → ALREADY_EXITED
// ─────────────────────────────────────────────────────────
router.post('/stage2', authenticate, async (req, res) => {
  const { qr_code, session_id } = req.body;
  if (!qr_code)   return res.status(400).json({ error: 'QR code required' });
  if (!session_id) return res.status(400).json({ error: 'session_id required — please select a session' });

  try {
    // Look up participant
    const pResult = await pool.query('SELECT * FROM participants WHERE qr_code = $1', [qr_code]);
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    // Look up session and cross-check event
    const sResult = await pool.query('SELECT * FROM sessions WHERE id = $1', [parseInt(session_id)]);
    if (!sResult.rows.length) {
      return res.status(404).json({ status: 'SESSION_NOT_FOUND', error: 'Session not found' });
    }
    const session = sResult.rows[0];

    if (p.event_id !== session.event_id) {
      return res.status(403).json({
        status: 'WRONG_EVENT',
        error: 'Participant is not registered for this session\'s event',
      });
    }

    // Find existing attendance record
    const attResult = await pool.query(
      'SELECT * FROM session_attendance WHERE session_id = $1 AND participant_id = $2',
      [parseInt(session_id), p.id]
    );

    const now = new Date();

    if (!attResult.rows.length) {
      // ── First scan: ENTRY ──
      const guardExpires = new Date(now.getTime() + 3 * 60 * 1000); // +3 min
      await pool.query(
        `INSERT INTO session_attendance (session_id, participant_id, entry_time, guard_expires_at)
         VALUES ($1, $2, NOW(), $3)`,
        [parseInt(session_id), p.id, guardExpires]
      );
      // Mark checkin_at_2 on participant (first ever)
      if (!p.checkin_at_2) {
        await pool.query(
          'UPDATE participants SET checkin_at_2 = NOW(), updated_at = NOW() WHERE id = $1',
          [p.id]
        );
      }
      const refreshed = await pool.query('SELECT * FROM participants WHERE id = $1', [p.id]);
      return res.json({
        status: 'ENTRY',
        message: `${p.name} — Session entry recorded. ✓`,
        action: 'entry',
        guard_expires_at: guardExpires.toISOString(),
        session_title: session.title,
        participant: sanitize(refreshed.rows[0]),
      });
    }

    const att = attResult.rows[0];

    if (att.exit_time) {
      // Already fully checked out
      return res.status(409).json({
        status: 'ALREADY_EXITED',
        message: `${p.name} has already entered and exited this session`,
        entry_time: att.entry_time,
        exit_time: att.exit_time,
        duration_seconds: att.duration_seconds,
        participant: sanitize(p),
      });
    }

    // Has entry, no exit yet — check cooldown
    const guardExpires = new Date(att.guard_expires_at);
    if (now < guardExpires) {
      const secondsLeft = Math.ceil((guardExpires - now) / 1000);
      return res.status(429).json({
        status: 'COOLDOWN_ACTIVE',
        message: `Exit too soon — please wait ${secondsLeft} more seconds to avoid accidental scan`,
        seconds_remaining: secondsLeft,
        guard_expires_at: att.guard_expires_at,
        participant: sanitize(p),
      });
    }

    // ── Second scan after cooldown: EXIT ──
    const entryTime = new Date(att.entry_time);
    const durationSeconds = Math.round((now - entryTime) / 1000);

    await pool.query(
      `UPDATE session_attendance
         SET exit_time = NOW(), duration_seconds = $1
       WHERE session_id = $2 AND participant_id = $3`,
      [durationSeconds, parseInt(session_id), p.id]
    );

    const refreshed = await pool.query('SELECT * FROM participants WHERE id = $1', [p.id]);
    return res.json({
      status: 'EXIT',
      message: `${p.name} — Session exit recorded. Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
      action: 'exit',
      entry_time: att.entry_time,
      exit_time: now.toISOString(),
      duration_seconds: durationSeconds,
      session_title: session.title,
      participant: sanitize(refreshed.rows[0]),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/checkin/stage3 — Speaker / Chairperson Verify
//   Only participants with role = 'speaker' or 'chairperson'
// ─────────────────────────────────────────────────────────
router.post('/stage3', authenticate, async (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR code required' });

  try {
    const pResult = await pool.query('SELECT * FROM participants WHERE qr_code = $1', [qr_code]);
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    if (!['speaker', 'chairperson'].includes(p.role)) {
      return res.status(403).json({
        status: 'NOT_AUTHORIZED',
        error: `Speaker Verify is restricted to Speakers and Chairpersons only. This participant is registered as "${p.role}".`,
        participant_role: p.role,
      });
    }

    if (!p.checkin_at_1) {
      return res.status(403).json({
        status: 'STAGE1_REQUIRED',
        error: 'Participant must complete Event Arrival (Stage 1) first',
      });
    }

    if (p.checkin_at_3) {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'Speaker/Chairperson already verified',
        participant: sanitize(p),
      });
    }

    const updated = await pool.query(
      `UPDATE participants SET checkin_at_3 = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [p.id]
    );

    res.json({
      status: 'SUCCESS',
      message: `${p.name} — ${p.role === 'chairperson' ? 'Chairperson' : 'Speaker'} access verified. ✓`,
      stage: 3,
      participant: sanitize(updated.rows[0]),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/checkin/status/:qr_code — full status across stages
// ─────────────────────────────────────────────────────────
router.get('/status/:qr_code', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.qr_code = $1',
      [req.params.qr_code]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = result.rows[0];
    res.json({
      participant: sanitize(p),
      stages: {
        stage1: { completed: !!p.checkin_at_1, time: p.checkin_at_1 },
        stage2: { completed: !!p.checkin_at_2, time: p.checkin_at_2 },
        stage3: { completed: !!p.checkin_at_3, time: p.checkin_at_3 },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/checkin/session-attendance/:session_id
//   Returns all attendance records for a session (for Sessions page)
// ─────────────────────────────────────────────────────────
router.get('/session-attendance/:session_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, p.name, p.organization, p.role, p.qr_code
       FROM session_attendance sa
       JOIN participants p ON p.id = sa.participant_id
       WHERE sa.session_id = $1
       ORDER BY sa.entry_time`,
      [req.params.session_id]
    );
    res.json({ attendance: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper ───────────────────────────────────────────────
function sanitize(p) {
  return {
    id:           p.id,
    name:         p.name,
    name_ja:      p.name_ja,
    email:        p.email,
    organization: p.organization,
    role:         p.role,
    qr_code:      p.qr_code,
    event_id:     p.event_id,
    checkin_at_1: p.checkin_at_1,
    checkin_at_2: p.checkin_at_2,
    checkin_at_3: p.checkin_at_3,
    is_checked_in: p.is_checked_in,
  };
}

export default router;
