/**
 * Email Service
 * Handles password reset emails and other notifications
 */

import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Initialize email service
 * Supports: Gmail, SendGrid, or SMTP
 */
function initializeEmailService() {
  // Check environment variables
  const emailService = process.env.EMAIL_SERVICE || 'smtp';
  
  if (emailService === 'gmail') {
    // Gmail SMTP (less secure, requires app password)
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_PASSWORD
      }
    });
  } else if (emailService === 'sendgrid') {
    // SendGrid SMTP
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else {
    // Generic SMTP (for local testing or custom SMTP)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      } : undefined
    });
  }

  console.log(`✅ Email service initialized: ${emailService}`);
  return transporter;
}

/**
 * Send password reset email
 * @param {string} email - User email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User name for greeting
 */
async function sendPasswordResetEmail(email, resetToken, userName) {
  if (!transporter) initializeEmailService();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const expiresIn = '1 hour';

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@eventhq.com',
    to: email,
    subject: 'EventHQ - Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e293b; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 20px; }
            .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>We received a request to reset your password for your EventHQ account. If you didn't make this request, you can ignore this email.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>
              
              <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
              
              <div class="warning">
                <strong>⚠️ Security Note:</strong> This link will expire in ${expiresIn}. If you need a new link, request another password reset.
              </div>
              
              <p><strong>If you didn't request this email:</strong> Please contact support immediately at support@eventhq.com</p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
              
              <p><small>This is an automated email. Please do not reply directly.</small></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} EventHQ. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset Request

Hi ${userName},

We received a request to reset your password. Click the link below:
${resetUrl}

This link expires in ${expiresIn}.

If you didn't request this, ignore this email.

EventHQ Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}:`, info.response);
    return { success: true, message: 'Password reset email sent' };
  } catch (err) {
    console.error(`❌ Failed to send email to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send event confirmation email
 * @param {string} email - Participant email
 * @param {object} eventData - Event details
 */
async function sendEventConfirmationEmail(email, eventData) {
  if (!transporter) initializeEmailService();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@eventhq.com',
    to: email,
    subject: `EventHQ - Registration Confirmed: ${eventData.eventName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .event-details { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✓ Registration Confirmed</h2>
            </div>
            <div class="content">
              <p>Hi <strong>${eventData.participantName}</strong>,</p>
              
              <p>Thank you for registering! Your spot is confirmed.</p>
              
              <div class="event-details">
                <h3>${eventData.eventName}</h3>
                <p><strong>📅 Date:</strong> ${eventData.eventDate}</p>
                <p><strong>📍 Venue:</strong> ${eventData.venue}</p>
                <p><strong>🎫 Ticket ID:</strong> ${eventData.participantId}</p>
              </div>
              
              <p>You'll receive a QR code when check-in opens. Have a great event!</p>
              
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
              
              <p><small>Questions? Contact: support@eventhq.com</small></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} EventHQ. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to send confirmation email:`, err.message);
    return { success: false, error: err.message };
  }
}

export {
  initializeEmailService,
  sendPasswordResetEmail,
  sendEventConfirmationEmail
};
