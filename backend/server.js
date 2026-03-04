import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from './db.js';

// Routes
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import sessionRoutes from './routes/sessions.js';
import participantRoutes from './routes/participants.js';
import checkinRoutes from './routes/checkin.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import emailRoutes from './routes/email.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is explicitly allowed or matches hosting patterns
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.endsWith('.onrender.com') || 
                     origin.endsWith('.vercel.app');

    if (!isAllowed) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/email', emailRoutes);

// DB Schema Init
async function initSchema() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      name_ja VARCHAR(255),
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      venue VARCHAR(255),
      status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
      capacity INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sub_events (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ja VARCHAR(255),
      description TEXT,
      venue_room VARCHAR(255),
      capacity INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      sub_event_id INTEGER NOT NULL REFERENCES sub_events(id) ON DELETE CASCADE,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      title_ja VARCHAR(255),
      speaker_name VARCHAR(255),
      room VARCHAR(255),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      capacity INTEGER DEFAULT 100,
      status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS participants (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      name_ja VARCHAR(255),
      email VARCHAR(255),
      organization VARCHAR(255),
      role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('participant', 'speaker', 'chairperson', 'vip', 'staff')),
      qr_code VARCHAR(255) UNIQUE NOT NULL,
      ticket_number VARCHAR(100),
      checkin_at_1 TIMESTAMPTZ,
      checkin_at_2 TIMESTAMPTZ,
      checkin_at_3 TIMESTAMPTZ,
      is_checked_in BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS session_attendance (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exit_time TIMESTAMPTZ,
      duration_seconds INTEGER,
      guard_expires_at TIMESTAMPTZ NOT NULL,
      is_early_exit_blocked BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(session_id, participant_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_participants_qr ON participants(qr_code)`,
    `CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_sub_event ON sessions(sub_event_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sub_events_event ON sub_events(event_id)`,
  ];

  try {
    for (const sql of tables) {
      await pool.query(sql);
    }

    // Seed demo users
    const seeds = [
      { name: 'System Admin', email: 'admin@eventhq.com', pass: 'admin123', role: 'admin' },
      { name: 'Event Manager', email: 'manager@eventhq.com', pass: 'manager123', role: 'manager' },
      { name: 'Check-in Staff', email: 'staff@eventhq.com', pass: 'staff123', role: 'staff' },
    ];

    for (const s of seeds) {
      const hash = await bcrypt.hash(s.pass, 10);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [s.name, s.email, hash, s.role]
      ).catch(() => {});
    }

    console.log('✅ Database schema initialized');
    console.log('📋 Demo: admin@eventhq.com/admin123 | manager@eventhq.com/manager123 | staff@eventhq.com/staff123');
  } catch (err) {
    console.error('Schema init error:', err.message);
  }
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 EventHQ Backend running on port ${PORT}`);
  await initSchema();
});
