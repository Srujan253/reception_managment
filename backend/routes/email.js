import express from 'express';
import nodemailer from 'nodemailer';
import pool from '../db.js';
import { authenticate, requireManager } from '../middleware/auth.js';

const router = express.Router();

// Configure the Nodemailer transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// POST /api/email/send-qr
// Body: { participant_ids: [1, 2, 3] }
// Sends each participant their QR code by email.
router.post('/send-qr', authenticate, requireManager, async (req, res) => {
  const { participant_ids, lang = 'en' } = req.body;
  if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
    return res.status(400).json({ error: 'participant_ids array required' });
  }

  // Ensure Gmail credentials exist
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Email configuration (GMAIL_USER, GMAIL_APP_PASSWORD) is missing on the server.' });
  }

  try {
    // Load participants (only those with an email)
    const placeholders = participant_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT p.*, e.name as event_name
       FROM participants p
       LEFT JOIN events e ON e.id = p.event_id
       WHERE p.id IN (${placeholders})`,
      participant_ids
    );

    const participants = result.rows;
    const withEmail    = participants.filter(p => p.email);
    const withoutEmail = participants.filter(p => !p.email);

    if (withEmail.length === 0) {
      return res.status(400).json({
        error: 'None of the selected participants have an email address.',
        skipped: withoutEmail.map(p => p.name),
      });
    }

    const sent    = [];
    const failed  = [];
    const skipped = withoutEmail.map(p => p.name);

    // Send one email per participant
    await Promise.allSettled(
      withEmail.map(async (p) => {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(p.qr_code)}&margin=10`;

        try {
          await transporter.sendMail({
            from: `"Event Registration" <${process.env.GMAIL_USER}>`,
            to:   p.email,
            subject: lang === 'ja' ? `QRチケット — ${p.event_name || 'イベント'}` : `Your QR Ticket — ${p.event_name || 'Event'}`,
            html: buildEmailHtml(p, qrImageUrl, lang),
          });
          sent.push(p.name);
        } catch (err) {
          failed.push({ name: p.name, error: err.message });
        }
      })
    );

    res.json({
      message: `QR emails sent successfully.`,
      sent_count:    sent.length,
      failed_count:  failed.length,
      skipped_count: skipped.length,
      sent,
      failed,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Email HTML template ────────────────────────────────────
function buildEmailHtml(p, qrImageUrl, lang) {
  const t = {
    ticketTitle: lang === 'ja' ? 'デジタルQR入場券' : 'Digital QR Entry Pass',
    participant: lang === 'ja' ? '参加者' : 'Participant',
    scanLabel:   lang === 'ja' ? '受付でスキャン' : 'Scan QR at Reception',
    ticketNum:   lang === 'ja' ? 'チケット番号 #' : 'Ticket #',
    footer:      lang === 'ja' ? 'このQRコードを受付で提示してください。' : 'Please present this QR code at the reception desk.',
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Ticket</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">🎟️</div>
            <div style="color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-.3px;">
              ${p.event_name || 'Event Ticket'}
            </div>
            <div style="color:#94a3b8;font-size:13px;margin-top:4px;">${t.ticketTitle}</div>
          </td>
        </tr>

        <!-- Participant info -->
        <tr>
          <td style="padding:32px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f1f5f9;border-radius:12px;padding:20px 24px;">
                  <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;">
                    ${t.participant}
                  </div>
                  <div style="font-size:18px;font-weight:700;color:#0f172a;">${p.name}</div>
                  ${p.organization ? `<div style="font-size:13px;color:#64748b;margin-top:3px;">${p.organization}</div>` : ''}
                  <div style="display:inline-block;margin-top:10px;padding:3px 12px;border-radius:999px;border:1px solid #cbd5e1;font-size:11px;font-weight:600;color:#475569;text-transform:capitalize;">
                    ${p.role}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- QR Code -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:16px;">
              ${t.scanLabel}
            </div>
            <div style="display:inline-block;padding:16px;border:2px solid #e2e8f0;border-radius:16px;background:#fff;">
              <img src="${qrImageUrl}" width="220" height="220"
                alt="QR Code"
                style="display:block;border-radius:8px;" />
            </div>
            <div style="margin-top:12px;font-size:11px;font-family:monospace;color:#94a3b8;word-break:break-all;">
              ${p.qr_code}
            </div>
          </td>
        </tr>

        ${p.ticket_number ? `
        <tr>
          <td style="padding:0 40px 20px;text-align:center;">
            <span style="font-size:12px;color:#64748b;font-weight:600;">${t.ticketNum}${p.ticket_number}</span>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <div style="font-size:11px;color:#94a3b8;">
              ${t.footer}
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default router;
