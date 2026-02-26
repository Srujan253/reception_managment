-- EventHQ Enterprise Check-in System Schema
-- Run this once to initialize the database

-- Users (authentication + RBAC)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Top-level Events
CREATE TABLE IF NOT EXISTS events (
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
);

-- Sub-Events (venues / tracks within an event)
CREATE TABLE IF NOT EXISTS sub_events (
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
);

-- Sessions (talks / workshops within sub-events)
CREATE TABLE IF NOT EXISTS sessions (
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
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_ja VARCHAR(255),
  email VARCHAR(255),
  organization VARCHAR(255),
  role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('participant', 'speaker', 'chairperson', 'vip', 'staff')),
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  ticket_number VARCHAR(100),
  -- 3-stage check-in timestamps
  checkin_at_1 TIMESTAMPTZ,    -- Stage 1: Event Arrival
  checkin_at_2 TIMESTAMPTZ,    -- Stage 2: Venue Check-in
  checkin_at_3 TIMESTAMPTZ,    -- Stage 3: Speaker Verification
  is_checked_in BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Attendance (with 3-minute anti-exit guard)
CREATE TABLE IF NOT EXISTS session_attendance (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  guard_expires_at TIMESTAMPTZ NOT NULL,  -- entry_time + 3 minutes
  is_early_exit_blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, participant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_qr ON participants(qr_code);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_sub_event ON sessions(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_event ON sub_events(event_id);

-- Seed admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('System Admin', 'admin@eventhq.com', '$2a$10$rOKw4K.PXeXG7Q1G.4N7YuRt5VW4JJ8Y7W4JJ8Y7W4J', 'admin')
ON CONFLICT (email) DO NOTHING;
