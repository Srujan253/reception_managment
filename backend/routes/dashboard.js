const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — global stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [
      eventsResult,
      liveCheckinsResult,
      sessionsTodayResult,
      totalRegisteredResult,
      recentCheckinsResult,
      checkinsByRoleResult,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM events"),
      pool.query("SELECT COUNT(*) as total FROM participants WHERE is_checked_in = true"),
      pool.query(`
        SELECT COUNT(*) as total FROM sessions 
        WHERE DATE(start_time) = CURRENT_DATE OR DATE(end_time) = CURRENT_DATE
      `),
      pool.query("SELECT COUNT(*) as total FROM participants"),
      pool.query(`
        SELECT p.name, p.role, p.qr_code, p.checkin_at_1, e.name as event_name
        FROM participants p
        LEFT JOIN events e ON e.id = p.event_id
        WHERE p.checkin_at_1 IS NOT NULL
        ORDER BY p.checkin_at_1 DESC LIMIT 10
      `),
      pool.query(`
        SELECT role, COUNT(*) as count FROM participants
        WHERE is_checked_in = true
        GROUP BY role ORDER BY count DESC
      `),
    ]);

    res.json({
      total_events: parseInt(eventsResult.rows[0].total),
      active_events: parseInt(eventsResult.rows[0].active),
      live_checkins: parseInt(liveCheckinsResult.rows[0].total),
      sessions_today: parseInt(sessionsTodayResult.rows[0].total),
      total_registered: parseInt(totalRegisteredResult.rows[0].total),
      checkin_rate: totalRegisteredResult.rows[0].total > 0
        ? Math.round((liveCheckinsResult.rows[0].total / totalRegisteredResult.rows[0].total) * 100)
        : 0,
      recent_checkins: recentCheckinsResult.rows,
      checkins_by_role: checkinsByRoleResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/hierarchy — full 4-tier hierarchy
router.get('/hierarchy', authenticate, async (req, res) => {
  try {
    const events = await pool.query(`
      SELECT e.*, COUNT(DISTINCT p.id) as participant_count
      FROM events e
      LEFT JOIN participants p ON p.event_id = e.id
      GROUP BY e.id ORDER BY e.start_date DESC LIMIT 20
    `);

    const result = [];
    for (const event of events.rows) {
      const subEvents = await pool.query(`
        SELECT se.*, COUNT(DISTINCT s.id) as session_count
        FROM sub_events se
        LEFT JOIN sessions s ON s.sub_event_id = se.id
        WHERE se.event_id = $1
        GROUP BY se.id ORDER BY se.created_at
      `, [event.id]);

      const subEventsWithSessions = [];
      for (const se of subEvents.rows) {
        const sessions = await pool.query(`
          SELECT s.*, COUNT(sa.id) as attendee_count
          FROM sessions s
          LEFT JOIN session_attendance sa ON sa.session_id = s.id AND sa.exit_time IS NULL
          WHERE s.sub_event_id = $1
          GROUP BY s.id ORDER BY s.start_time
        `, [se.id]);

        subEventsWithSessions.push({
          ...se,
          sessions: sessions.rows,
        });
      }

      result.push({ ...event, sub_events: subEventsWithSessions });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
