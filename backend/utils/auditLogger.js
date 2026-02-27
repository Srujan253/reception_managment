/**
 * Audit Logging Utility
 * Tracks all critical user actions for compliance and security
 */

const pool = require('../db');

/**
 * Log an audit event
 * @param {string} action - Action performed (login, create, update, delete, checkin, etc.)
 * @param {number} userId - ID of user performing action
 * @param {string} targetTable - Table affected (users, participants, events, etc.)
 * @param {string} targetId - ID of affected resource
 * @param {string} details - Additional JSON details
 * @param {string} ipAddress - IP address of requester
 * @param {string} status - success, failure
 */
async function auditLog(action, userId, targetTable, targetId, details = null, ipAddress = null, status = 'success') {
  try {
    await pool.query(
      `INSERT INTO audit_logs (action, user_id, target_table, target_id, details, ip_address, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        action,
        userId || null,
        targetTable,
        targetId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        status
      ]
    );
  } catch (err) {
    // Don't throw - logging should not break main operations
    console.error('Audit log error:', err.message);
  }
}

/**
 * Get audit logs with filters
 * @param {object} filters - { action, userId, targetTable, startDate, endDate, limit }
 */
async function getAuditLogs(filters = {}) {
  const { action, userId, targetTable, startDate, endDate, limit = 1000 } = filters;
  
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action) {
    params.push(action);
    query += ` AND action = $${params.length}`;
  }
  if (userId) {
    params.push(userId);
    query += ` AND user_id = $${params.length}`;
  }
  if (targetTable) {
    params.push(targetTable);
    query += ` AND target_table = $${params.length}`;
  }
  if (startDate) {
    params.push(new Date(startDate));
    query += ` AND created_at >= $${params.length}`;
  }
  if (endDate) {
    params.push(new Date(endDate));
    query += ` AND created_at <= $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit}`;

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Audit log query error:', err.message);
    return [];
  }
}

module.exports = { auditLog, getAuditLogs };
