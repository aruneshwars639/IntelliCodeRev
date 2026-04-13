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

// Strip sslmode param from URL — we pass ssl config directly to pg
// to avoid the pg-connection-string SSL deprecation warning
function sanitizeUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    return u.toString()
  } catch {
    return url
  }
}

function getSslConfig() {
  if (sslDisabled || isLocal) return false
  // Explicitly use verify-full semantics (rejectUnauthorized: true)
  // This is the future default and silences the pg SSL deprecation warning
  return { rejectUnauthorized: true }
}

export const pool = new Pool({
  connectionString: (sslDisabled || isLocal)
    ? process.env.DATABASE_URL
    : sanitizeUrl(process.env.DATABASE_URL),
  ssl: getSslConfig(),
  max: 5,                        // Neon free tier: keep this low
  idleTimeoutMillis: 10000,      // release idle connections faster (before Neon kills them)
  connectionTimeoutMillis: 10000,
  keepAlive: false,              // don't keep TCP alive — let Neon close cleanly
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
