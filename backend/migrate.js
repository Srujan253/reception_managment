// migrate.js — run once to add new columns
import pool from './db.js';

async function migrate() {
  try {
    console.log('Running migrations...');
    
    await pool.query(`
      ALTER TABLE participants 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
    `);
    console.log('✅ Added phone column to participants');

    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS speaker_names TEXT
    `);
    console.log('✅ Added speaker_names column to sessions');

    await pool.query(`
      ALTER TABLE sessions 
      ADD COLUMN IF NOT EXISTS chairperson_names TEXT
    `);
    console.log('✅ Added chairperson_names column to sessions');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_attendance (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exit_time TIMESTAMPTZ,
        duration_seconds INTEGER,
        guard_expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, participant_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_session_attendance_participant ON session_attendance(participant_id)`);
    console.log('✅ session_attendance table ready');

    console.log('✅ All migrations complete');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
