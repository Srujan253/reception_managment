import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/participants/register — public self-registration
router.post('/register', async (req, res) => {
  const { event_id, name, email } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name required' });

  try {
    const qr_code = `EVT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO participants (event_id, name, email, role, qr_code)
       VALUES ($1, $2, $3, 'participant', $4) RETURNING *`,
      [event_id, name, email || null, qr_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/participants — list with pagination, filter
router.get('/', authenticate, async (req, res) => {
  const { event_id, role, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE 1=1';
  const params = [];

  if (event_id) { params.push(event_id); query += ` AND p.event_id = $${params.length}`; }
  if (role) { params.push(role); query += ` AND p.role = $${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR p.email ILIKE $${params.length} OR p.qr_code ILIKE $${params.length})`; }

  const countParams = [...params];
  const countQuery = query.replace('SELECT p.*, e.name as event_name', 'SELECT COUNT(*)');

  params.push(parseInt(limit), offset);
  query += ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  try {
    const [data, count] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);
    res.json({
      participants: data.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/participants/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Participant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/participants/qr/:code — lookup by QR code
router.get('/qr/:code', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.qr_code = $1',
      [req.params.code]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'QR code not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/participants — create
router.post('/', authenticate, requireManager, async (req, res) => {
  const { event_id, name, name_ja, email, phone, organization, role, ticket_number, notes } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name required' });

  try {
    const qr_code = `EVT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO participants (event_id, name, name_ja, email, phone, organization, role, qr_code, ticket_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [event_id, name, name_ja, email, phone || null, organization, role || 'participant', qr_code, ticket_number, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/participants/:id
router.put('/:id', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, email, phone, organization, role, ticket_number, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE participants SET name=$1, name_ja=$2, email=$3, phone=$4, organization=$5, role=$6,
       ticket_number=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, name_ja, email, phone || null, organization, role, ticket_number, notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Participant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/participants/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    await pool.query('DELETE FROM participants WHERE id = $1', [req.params.id]);
    res.json({ message: 'Participant deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/participants/import — bulk CSV import
router.post('/import', authenticate, requireManager, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });

  try {
    // Remove UTF-8 BOM if present
    let csvContent = req.file.buffer.toString('utf8');
    if (csvContent.charCodeAt(0) === 0xFEFF) csvContent = csvContent.slice(1);

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { success: 0, errors: [] };

    for (const row of records) {
      const name = row['Name'] || row['名前'] || row['name'];
      if (!name) continue;

      try {
        const qr_code = `EVT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
        await pool.query(
          `INSERT INTO participants (event_id, name, name_ja, email, organization, role, qr_code, ticket_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (qr_code) DO NOTHING`,
          [
            event_id,
            name,
            row['Name (JP)'] || row['名前（日本語）'] || null,
            row['Email'] || row['メール'] || null,
            row['Organization'] || row['組織'] || null,
            (row['Role'] || row['役割'] || 'participant').toLowerCase(),
            qr_code,
            row['Ticket'] || row['チケット'] || null,
          ]
        );
        results.success++;
      } catch (rowErr) {
        results.errors.push({ row: name, error: rowErr.message });
      }
    }

    res.json({ message: `Imported ${results.success} participants`, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/participants/export — flexible CSV export by query params
// Supports: ?event_id=&role=&search=
router.get('/export', authenticate, async (req, res) => {
  const { event_id, role, search } = req.query;
  try {
    let query = 'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE 1=1';
    const params = [];
    if (event_id) { params.push(event_id); query += ` AND p.event_id = $${params.length}`; }
    if (role && role !== 'all') { params.push(role); query += ` AND p.role = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (p.name ILIKE $${params.length} OR p.email ILIKE $${params.length})`; }
    query += ' ORDER BY p.created_at';

    const result = await pool.query(query, params);

    const header = 'ID,Name / 名前,Email / メール,Phone / 電話番号,Organization / 組織,Role / 役割,QR Code / QRコード,Ticket / チケット,Event / イベント,Event Arrival / イベント受付,Speaker Verify / スピーカー確認\n';
    const rows = result.rows.map(p => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.phone || '').replace(/"/g, '""')}"`,
      `"${(p.organization || '').replace(/"/g, '""')}"`,
      p.role,
      p.qr_code,
      `"${(p.ticket_number || '').replace(/"/g, '""')}"`,
      `"${(p.event_name || '').replace(/"/g, '""')}"`,
      p.checkin_at_1 ? new Date(p.checkin_at_1).toISOString() : '',
      p.checkin_at_3 ? new Date(p.checkin_at_3).toISOString() : '',
    ].join(',')).join('\n');

    const csv = '\uFEFF' + header + rows;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants_export.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/participants/export/:event_id — legacy export by event (kept for backward compat)
router.get('/export/:event_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.event_id = $1 ORDER BY p.created_at',
      [req.params.event_id]
    );

    const header = 'ID,Name / 名前,Email / メール,Phone / 電話番号,Organization / 組織,Role / 役割,QR Code / QRコード,Ticket / チケット,Event Arrival / イベント受付,Speaker Verify / スピーカー確認,Checked In / チェックイン済み\n';
    const rows = result.rows.map(p =>
      [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${(p.organization || '').replace(/"/g, '""')}"`,
        p.role,
        p.qr_code,
        `"${(p.ticket_number || '').replace(/"/g, '""')}"`,
        p.checkin_at_1 ? new Date(p.checkin_at_1).toISOString() : '',
        p.checkin_at_3 ? new Date(p.checkin_at_3).toISOString() : '',
        p.is_checked_in ? 'Yes / はい' : 'No / いいえ',
      ].join(',')
    ).join('\n');

    const csv = '\uFEFF' + header + rows;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants_event_${req.params.event_id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
