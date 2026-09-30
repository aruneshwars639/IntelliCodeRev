import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in .env')
}

// Detect connection type from URL
const isNeon      = process.env.DATABASE_URL.includes('neon.tech')
const isLocal     = process.env.DATABASE_URL.includes('localhost') ||
                    process.env.DATABASE_URL.includes('127.0.0.1')
const sslDisabled = process.env.DB_SSL === 'false'

// Strip sslmode & channel_binding params from URL — we pass ssl config
// directly to pg. channel_binding=require causes timeouts because the
// Node pg driver doesn't support SCRAM channel binding.
function sanitizeUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

function getSslConfig() {
  if (sslDisabled || isLocal) return false
  // Explicitly use verify-full semantics (rejectUnauthorized: true)
  // This is the future default and silences the pg SSL deprecation warning
  return { rejectUnauthorized: false }
}

export const pool = new Pool({
  connectionString: (sslDisabled || isLocal)
    ? process.env.DATABASE_URL
    : sanitizeUrl(process.env.DATABASE_URL),
  ssl: getSslConfig(),
  max: 5,                        // Neon free tier: keep this low
  idleTimeoutMillis: 10000,      // release idle connections faster (before Neon kills them)
  connectionTimeoutMillis: 10000,
  keepAlive: true,               // send TCP keepalive to prevent Neon from dropping idle connections
})

pool.on('connect', () => console.log('✓ Postgres connected'))
pool.on('error', (err) => {
  if (err.code === 'ECONNRESET') return  // Neon closes idle connections — expected
  console.error('Postgres error:', err.message)
})

export async function query(text, params) {
  try {
    const res = await pool.query(text, params)
    return res
  } catch (err) {
    console.error('Query error:', err.message)
    console.error('Query was:', text.slice(0, 100))
    throw err
  }
}

export async function getClient() {
  return pool.connect()
}
