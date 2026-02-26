const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/checkin/stage1 — Event Arrival
router.post('/stage1', authenticate, async (req, res) => {
  const { qr_code, event_id } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR code required' });

  try {
    const pResult = await pool.query(
      'SELECT * FROM participants WHERE qr_code = $1',
      [qr_code]
    );
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    if (event_id && p.event_id !== parseInt(event_id)) {
      return res.status(403).json({ status: 'WRONG_EVENT', error: 'Participant not registered for this event' });
    }

    if (p.checkin_at_1) {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'Already checked in at Stage 1',
        participant: sanitizeParticipant(p),
        checkin_at_1: p.checkin_at_1
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
      participant: sanitizeParticipant(updated.rows[0])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/checkin/stage2 — Venue Check-in
router.post('/stage2', authenticate, async (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR code required' });

  try {
    const pResult = await pool.query('SELECT * FROM participants WHERE qr_code = $1', [qr_code]);
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    if (!p.checkin_at_1) {
      return res.status(403).json({
        status: 'STAGE1_REQUIRED',
        error: 'Must complete Event Arrival (Stage 1) first'
      });
    }

    if (p.checkin_at_2) {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'Already checked in at Stage 2',
        participant: sanitizeParticipant(p)
      });
    }

    const updated = await pool.query(
      `UPDATE participants SET checkin_at_2 = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [p.id]
    );

    res.json({
      status: 'SUCCESS',
      message: `${p.name} — Venue access granted.`,
      stage: 2,
      participant: sanitizeParticipant(updated.rows[0])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/checkin/stage3 — Speaker/VIP Verification
router.post('/stage3', authenticate, async (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'QR code required' });

  try {
    const pResult = await pool.query('SELECT * FROM participants WHERE qr_code = $1', [qr_code]);
    if (!pResult.rows.length) {
      return res.status(404).json({ status: 'NOT_FOUND', error: 'Participant not found' });
    }
    const p = pResult.rows[0];

    if (!['speaker', 'chairperson', 'vip'].includes(p.role)) {
      return res.status(403).json({
        status: 'NOT_AUTHORIZED',
        error: 'Speaker/VIP verification only for speakers, chairpersons, and VIPs'
      });
    }

    if (!p.checkin_at_1) {
      return res.status(403).json({ status: 'STAGE1_REQUIRED', error: 'Must complete Stage 1 first' });
    }

    if (p.checkin_at_3) {
      return res.status(409).json({
        status: 'ALREADY_CHECKED_IN',
        message: 'Already verified at Stage 3',
        participant: sanitizeParticipant(p)
      });
    }

    const updated = await pool.query(
      `UPDATE participants SET checkin_at_3 = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [p.id]
    );

    res.json({
      status: 'SUCCESS',
      message: `${p.name} — Speaker access verified. ✓`,
      stage: 3,
      participant: sanitizeParticipant(updated.rows[0])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkin/status/:qr_code — full status across all stages
router.get('/status/:qr_code', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.qr_code = $1',
      [req.params.qr_code]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = result.rows[0];

    res.json({
      participant: sanitizeParticipant(p),
      stages: {
        stage1: { completed: !!p.checkin_at_1, time: p.checkin_at_1 },
        stage2: { completed: !!p.checkin_at_2, time: p.checkin_at_2 },
        stage3: { completed: !!p.checkin_at_3, time: p.checkin_at_3 },
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function sanitizeParticipant(p) {
  return {
    id: p.id,
    name: p.name,
    name_ja: p.name_ja,
    email: p.email,
    organization: p.organization,
    role: p.role,
    qr_code: p.qr_code,
    event_id: p.event_id,
    checkin_at_1: p.checkin_at_1,
    checkin_at_2: p.checkin_at_2,
    checkin_at_3: p.checkin_at_3,
    is_checked_in: p.is_checked_in,
  };
}

module.exports = router;
