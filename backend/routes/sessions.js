import express from 'express';
import pool from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = express.Router();

const GUARD_MINUTES = 3;

// GET /api/sessions — list all sessions (with optional event_id filter)
router.get('/', authenticate, async (req, res) => {
  const { event_id, sub_event_id } = req.query;
  let query = `
    SELECT s.*, se.name as sub_event_name, e.name as event_name,
      COUNT(sa.id) as attendee_count
    FROM sessions s
    LEFT JOIN sub_events se ON se.id = s.sub_event_id
    LEFT JOIN events e ON e.id = s.event_id
    LEFT JOIN session_attendance sa ON sa.session_id = s.id AND sa.exit_time IS NULL
  `;
  const params = [];
  const conditions = [];
  if (event_id) { conditions.push(`s.event_id = $${params.length + 1}`); params.push(event_id); }
  if (sub_event_id) { conditions.push(`s.sub_event_id = $${params.length + 1}`); params.push(sub_event_id); }
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY s.id, se.name, e.name ORDER BY s.start_time';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id — single session with live attendees
router.get('/:id', authenticate, async (req, res) => {
  try {
    const session = await pool.query(`
      SELECT s.*, se.name as sub_event_name, e.name as event_name
      FROM sessions s
      LEFT JOIN sub_events se ON se.id = s.sub_event_id
      LEFT JOIN events e ON e.id = s.event_id
      WHERE s.id = $1
    `, [req.params.id]);
    
    if (!session.rows.length) return res.status(404).json({ error: 'Session not found' });

    const attendees = await pool.query(`
      SELECT sa.*, p.name, p.name_ja, p.email, p.role, p.organization,
        sa.guard_expires_at > NOW() as guard_active,
        EXTRACT(EPOCH FROM (NOW() - sa.entry_time))::INTEGER as seconds_in
      FROM session_attendance sa
      JOIN participants p ON p.id = sa.participant_id
      WHERE sa.session_id = $1
      ORDER BY sa.entry_time DESC
    `, [req.params.id]);

    res.json({ ...session.rows[0], attendees: attendees.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — create session
router.post('/', authenticate, requireManager, async (req, res) => {
  const { sub_event_id, event_id, title, title_ja, speaker_name, speaker_names, chairperson_names, room, start_time, end_time, capacity } = req.body;
  if (!sub_event_id || !event_id || !title || !start_time || !end_time) {
    return res.status(400).json({ error: 'sub_event_id, event_id, title, start_time, end_time required' });
  }
  // Null capacity = unlimited; empty string or missing = unlimited
  const safeCapacity = (capacity !== '' && capacity != null) ? parseInt(capacity, 10) : null;

  try {
    const result = await pool.query(
      `INSERT INTO sessions (sub_event_id, event_id, title, title_ja, speaker_name, speaker_names, chairperson_names, room, start_time, end_time, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [sub_event_id, event_id, title, title_ja, speaker_name || speaker_names || null, speaker_names || null, chairperson_names || null, room, start_time, end_time, safeCapacity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/:id
router.put('/:id', authenticate, requireManager, async (req, res) => {
  const { title, title_ja, speaker_name, speaker_names, chairperson_names, room, start_time, end_time, capacity, status } = req.body;
  const safeCapacity = (capacity !== '' && capacity != null) ? parseInt(capacity, 10) : null;
  try {
    const result = await pool.query(
      `UPDATE sessions SET title=$1, title_ja=$2, speaker_name=$3, speaker_names=$4, chairperson_names=$5,
       room=$6, start_time=$7, end_time=$8, capacity=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, title_ja, speaker_name || speaker_names || null, speaker_names || null, chairperson_names || null, room, start_time, end_time, safeCapacity, status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sessions/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/attend — check in to session
router.post('/:id/attend', authenticate, async (req, res) => {
  const { participant_id } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id required' });

  try {
    const existing = await pool.query(
      'SELECT * FROM session_attendance WHERE session_id = $1 AND participant_id = $2',
      [req.params.id, participant_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already checked in to this session', record: existing.rows[0] });
    }

    const guardExpiresAt = new Date(Date.now() + GUARD_MINUTES * 60 * 1000);
    const result = await pool.query(
      `INSERT INTO session_attendance (session_id, participant_id, guard_expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, participant_id, guardExpiresAt]
    );

    res.status(201).json({ 
      message: 'Checked in to session',
      attendance: result.rows[0],
      guard_minutes: GUARD_MINUTES
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/exit — check out from session (with 3-min guard)
router.post('/:id/exit', authenticate, async (req, res) => {
  const { participant_id, force = false } = req.body;
  if (!participant_id) return res.status(400).json({ error: 'participant_id required' });

  try {
    const record = await pool.query(
      'SELECT * FROM session_attendance WHERE session_id = $1 AND participant_id = $2',
      [req.params.id, participant_id]
    );

    if (!record.rows.length) return res.status(404).json({ error: 'No attendance record found' });
    const attendance = record.rows[0];
    if (attendance.exit_time) return res.status(409).json({ error: 'Already checked out' });

    const guardActive = new Date(attendance.guard_expires_at) > new Date();
    if (guardActive && !force) {
      const remaining = Math.ceil((new Date(attendance.guard_expires_at) - new Date()) / 1000);
      return res.status(403).json({
        error: 'GUARD_ACTIVE',
        message: `Minimum attendance period not met. ${remaining} seconds remaining.`,
        guard_expires_at: attendance.guard_expires_at,
        remaining_seconds: remaining
      });
    }

    const exitTime = new Date();
    const duration = Math.floor((exitTime - new Date(attendance.entry_time)) / 1000);
    const result = await pool.query(
      `UPDATE session_attendance 
       SET exit_time = $1, duration_seconds = $2, is_early_exit_blocked = false
       WHERE session_id = $3 AND participant_id = $4 RETURNING *`,
      [exitTime, duration, req.params.id, participant_id]
    );

    res.json({ message: 'Checked out of session', attendance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
