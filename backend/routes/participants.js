const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { authenticate, requireManager, requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../utils/auditLogger');
const { validateEmail, validatePhone, validateName, validateCategory } = require('../utils/validator');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/participants/register — public self-registration
router.post('/register', async (req, res) => {
  const { event_id, name, email } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name required' });

  // Validate name
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validate email if provided
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }
  }

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

  let query = 'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.deleted = false';
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
      'SELECT p.*, e.name as event_name FROM participants p LEFT JOIN events e ON e.id = p.event_id WHERE p.id = $1 AND p.deleted = false',
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
  const { event_id, name, name_ja, email, organization, role, ticket_number, notes } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: 'event_id and name required' });

  // Validate name
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validate email if provided
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }
  }

  // Validate role if provided
  if (role) {
    const roleValidation = validateCategory(role);
    if (!roleValidation.valid) {
      return res.status(400).json({ error: roleValidation.error });
    }
  }

  try {
    const qr_code = `EVT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO participants (event_id, name, name_ja, email, organization, role, qr_code, ticket_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [event_id, name, name_ja, email, organization, role || 'participant', qr_code, ticket_number, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/participants/:id
router.put('/:id', authenticate, requireManager, async (req, res) => {
  const { name, name_ja, email, organization, role, ticket_number, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE participants SET name=$1, name_ja=$2, email=$3, organization=$4, role=$5,
       ticket_number=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, name_ja, email, organization, role, ticket_number, notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Participant not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/participants/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  try {
    const result = await pool.query(
      'UPDATE participants SET deleted = true, updated_at = NOW() WHERE id = $1 AND deleted = false RETURNING id, name',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Participant not found' });
    
    await auditLog('participant_deleted', req.user.id, 'participants', req.params.id, { name: result.rows[0].name }, ipAddress);
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

// GET /api/participants/export/:event_id — CSV export with UTF-8 BOM
router.get('/export/:event_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM participants WHERE event_id = $1 ORDER BY created_at',
      [req.params.event_id]
    );

    // CSV headers (English / Japanese)
    const header = 'ID,Name / 名前,Name (JP) / 名前（日本語）,Email / メール,Organization / 組織,Role / 役割,QR Code / QRコード,Ticket / チケット,Stage1 Check-in,Stage2 Check-in,Stage3 Check-in,Checked In / チェックイン済み\n';
    const rows = result.rows.map(p =>
      [
        p.id,
        `"${p.name || ''}"`,
        `"${p.name_ja || ''}"`,
        `"${p.email || ''}"`,
        `"${p.organization || ''}"`,
        p.role,
        p.qr_code,
        `"${p.ticket_number || ''}"`,
        p.checkin_at_1 ? new Date(p.checkin_at_1).toISOString() : '',
        p.checkin_at_2 ? new Date(p.checkin_at_2).toISOString() : '',
        p.checkin_at_3 ? new Date(p.checkin_at_3).toISOString() : '',
        p.is_checked_in ? 'Yes / はい' : 'No / いいえ',
      ].join(',')
    ).join('\n');

    const csv = '\uFEFF' + header + rows; // UTF-8 BOM

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participants_event_${req.params.event_id}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
