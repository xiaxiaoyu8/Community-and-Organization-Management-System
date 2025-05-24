// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Uncomment and configure for production
});

export default pool;