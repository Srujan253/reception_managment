import express from 'express';
import pool from '../db.js';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth.js';
import { auditLog } from '../utils/auditLogger.js';
import { validateDate, validateDateRange, validateText, validateInteger } from '../utils/validator.js';

const router = express.Router();

// GET /api/events/public/active — list active/upcoming events for public registration
router.get('/public/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, name_ja, description, start_date, end_date, venue 
      FROM events 
      WHERE status IN ('upcoming', 'active') AND deleted = false
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
      LEFT JOIN sub_events se ON se.event_id = e.id AND se.deleted = false
      LEFT JOIN participants p ON p.event_id = e.id AND p.deleted = false
      WHERE e.deleted = false
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
    const event = await pool.query('SELECT * FROM events WHERE id = $1 AND deleted = false', [req.params.id]);
    if (!event.rows.length) return res.status(404).json({ error: 'Event not found' });
    
    const subEvents = await pool.query(
      'SELECT * FROM sub_events WHERE event_id = $1 AND deleted = false ORDER BY created_at',
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

  // Validate name
  const nameValidation = validateText(name, 1, 255);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validate dates
  const startDateValidation = validateDate(start_date);
  if (!startDateValidation.valid) {
    return res.status(400).json({ error: startDateValidation.error });
  }

  const endDateValidation = validateDate(end_date);
  if (!endDateValidation.valid) {
    return res.status(400).json({ error: endDateValidation.error });
  }

  // Validate date range
  const rangeValidation = validateDateRange(start_date, end_date);
  if (!rangeValidation.valid) {
    return res.status(400).json({ error: rangeValidation.error });
  }

  // Validate capacity if provided
  if (capacity !== undefined && capacity !== null) {
    const capacityValidation = validateInteger(capacity, 0, 999999);
    if (!capacityValidation.valid) {
      return res.status(400).json({ error: capacityValidation.error });
    }
  }

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
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const result = await pool.query(
      `UPDATE events SET name=$1, name_ja=$2, description=$3, start_date=$4, end_date=$5,
       venue=$6, capacity=$7, status=$8, updated_at=NOW() WHERE id=$9 AND deleted = false RETURNING *`,
      [name, name_ja, description, start_date, end_date, venue, capacity, status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    
    await auditLog('event_updated', req.user.id, 'events', req.params.id, { name }, ipAddress);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    const result = await pool.query(
      'UPDATE events SET deleted = true, updated_at = NOW() WHERE id = $1 AND deleted = false RETURNING id, name',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    
    await auditLog('event_deleted', req.user.id, 'events', req.params.id, { name: result.rows[0].name }, ipAddress);
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

export default router;
