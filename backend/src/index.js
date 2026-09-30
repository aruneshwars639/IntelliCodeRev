import express    from 'express'
import cors       from 'cors'
import helmet     from 'helmet'
import 'dotenv/config'
import 'express-async-errors'

import { pool }          from './db/supabase.js'
import authRoutes        from './routes/auth.js'
import repoRoutes        from './routes/repos.js'
import reviewRoutes      from './routes/reviews.js'
import webhookRoutes     from './routes/webhook.js'
import { errorHandler }  from './middleware/errorHandler.js'
import { authMiddleware } from './middleware/auth.js'

const app  = express()
const PORT = process.env.PORT || 3001

// Test DB connection on startup — gives clear error instead of ECONNRESET
async function testDbConnection() {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    console.log('✓ Database connected')
  } catch (err) {
    console.error('✗ Database connection failed:', err.message)
    console.error('')
    console.error('Common fixes:')
    console.error('  • Local Postgres: add DB_SSL=false to your .env')
    console.error('  • Neon: make sure DATABASE_URL ends with ?sslmode=require')
    console.error('  • Check your DATABASE_URL is correct in .env')
    console.error('')
    process.exit(1)   // stop the server — no point running without DB
  }
}

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))

// Webhook needs raw body — register BEFORE json parser
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes)

app.use(express.json())

// Public routes
app.use('/auth',   authRoutes)
app.get('/health', async (_, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: 'connected' })
  } catch {
    res.status(500).json({ ok: false, db: 'disconnected' })
  }
})

// Protected routes
app.use('/repos',   authMiddleware, repoRoutes)
app.use('/reviews', authMiddleware, reviewRoutes)

app.use(errorHandler)

// Start — test DB first, then listen
testDbConnection().then(() => {
  app.listen(PORT, () => console.log(`Backend → http://localhost:${PORT}`))
})
