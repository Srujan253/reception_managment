import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Strip channel_binding param which can cause issues with some pg versions
const connStr = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('?channel_binding=require&', '?');

const pool = new Pool({
  connectionString: connStr,
  ssl: {
    rejectUnauthorized: false,
    require: true,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ DB Pool Error:', err.message);
});

export default pool;
