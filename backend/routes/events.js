const express = require('express');
const pool = require('../db');
const { authenticate, requireManager, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/events/public/active — list active/upcoming events for public registration
router.get('/public/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, name_ja, description, start_date, end_date, venue 
      FROM events 
      WHERE status IN ('upcoming', 'active')
      ORDER BY start_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events — list all events
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
        COUNT(DISTINCT se.id) as sub_event_count,
        COUNT(DISTINCT p.id) as participant_count
      FROM events e
      LEFT JOIN sub_events se ON se.event_id = e.id
      LEFT JOIN participants p ON p.event_id = e.id
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id — single event with sub-events
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event.rows.length) return res.status(404).json({ error: 'Event not found' });
    
    const subEvents = await pool.query(
      'SELECT * FROM sub_events WHERE event_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    
    res.json({ ...event.rows[0], sub_events: subEvents.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events — create event
router.post('/', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, description, start_date, end_date, venue, capacity } = req.body;
  if (!name || !start_date || !end_date) return res.status(400).json({ error: 'Name and dates required' });

  try {
    const result = await pool.query(
      `INSERT INTO events (name, name_ja, description, start_date, end_date, venue, capacity, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8) RETURNING *`,
      [name, name_ja, description, start_date, end_date, venue, capacity || 0, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:id — update event
router.put('/:id', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, description, start_date, end_date, venue, capacity, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE events SET name=$1, name_ja=$2, description=$3, start_date=$4, end_date=$5,
       venue=$6, capacity=$7, status=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, name_ja, description, start_date, end_date, venue, capacity, status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sub-Events ---

// GET /api/events/:id/sub-events
router.get('/:id/sub-events', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT se.*, COUNT(DISTINCT s.id) as session_count
       FROM sub_events se
       LEFT JOIN sessions s ON s.sub_event_id = se.id
       WHERE se.event_id = $1
       GROUP BY se.id
       ORDER BY se.created_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/sub-events
router.post('/:id/sub-events', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, description, venue_room, capacity } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const result = await pool.query(
      `INSERT INTO sub_events (event_id, name, name_ja, description, venue_room, capacity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, name, name_ja, description, venue_room, capacity || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:eventId/sub-events/:subId
router.put('/:eventId/sub-events/:subId', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, description, venue_room, capacity, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE sub_events SET name=$1, name_ja=$2, description=$3, venue_room=$4,
       capacity=$5, status=$6, updated_at=NOW() WHERE id=$7 AND event_id=$8 RETURNING *`,
      [name, name_ja, description, venue_room, capacity, status, req.params.subId, req.params.eventId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Sub-event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:eventId/sub-events/:subId
router.delete('/:eventId/sub-events/:subId', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM sub_events WHERE id = $1 AND event_id = $2', [req.params.subId, req.params.eventId]);
    res.json({ message: 'Sub-event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
