import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { buildAutoFixGraph } from './graph/autoFixGraph.js'
import { crawlRepo } from './tools/repoCrawler.js'

const { Pool } = pg

const redisUrl = (process.env.UPSTASH_REDIS_URL || '').replace(/^redis:\/\//, 'rediss://')

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: {},
  enableOfflineQueue: false,
})

connection.on('error', (err) => {
  if (err.code === 'ECONNRESET') return   // Upstash/Neon idle resets — expected
  console.error('Redis error:', err.message)
})

// Strip params the pg driver can't handle (channel_binding, sslmode)
function sanitizeDbUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DB_SSL === 'false'

const pool = new Pool({
  connectionString: isLocal ? process.env.DATABASE_URL : sanitizeDbUrl(process.env.DATABASE_URL),
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 3,                    // keep low — agents don't need many connections
  idleTimeoutMillis: 10000,  // release idle connections before Neon kills them
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  if (err.code === 'ECONNRESET') return   // Neon closes idle connections — expected
  console.error('Postgres error:', err.message)
})

async function db(text, params) {
  const { rows } = await pool.query(text, params)
  return rows
}

const graph = buildAutoFixGraph()

const worker = new Worker('review-jobs', async (job) => {
  const { jobId, owner, repo, branch = 'main', userId } = job.data
  const start = Date.now()
  console.log(`\n▶ Job ${jobId} — ${owner}/${repo}@${branch}`)

  await db('UPDATE review_jobs SET status = $1 WHERE id = $2', ['running', jobId])

  try {
    const crawl = await crawlRepo({ owner, repo, branch, userId, pool })
    const BATCH = 10
    const allFindings = []
    const allLog = []
    let prResult = null

    for (let i = 0; i < crawl.files.length; i += BATCH) {
      const batch = crawl.files.slice(i, i + BATCH)
      console.log(`Batch ${Math.floor(i / BATCH) + 1} — ${batch.length} files`)

      const result = await graph.invoke({ jobId, userId, owner, repo, branch, filesToScan: batch })
      allFindings.push(...(result.confirmed_findings ?? []))
      allLog.push(...(result.agent_log ?? []))
      if (result.pr_result && !prResult) prResult = result.pr_result
    }

    // Save findings
    for (const f of allFindings) {
      await db(`
        INSERT INTO findings
          (job_id, type, severity, title, description, file, line_start, line_end, cwe, suggestion, data)
        VALUES ($1, 'vulnerability', $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [jobId, f.severity, f.title, f.description, f.file,
        f.line_start ?? null, f.line_end ?? null, f.cwe ?? null,
        f.suggestion ?? null, JSON.stringify(f)])
    }

    const critical = allFindings.filter(f => f.severity === 'critical').length
    const warnings = allFindings.filter(f => f.severity === 'warning').length
    const summary = `Scanned ${crawl.fetchedFiles} files. Found ${critical} critical, ${warnings} warnings.` +
      (prResult ? ` Fix PR: ${prResult.prUrl}` : ' No auto-fix PR created.')

    await db(`
      UPDATE review_jobs SET
        status       = 'complete',
        summary      = $1,
        agent_log    = $2,
        model_used   = $3,
        duration_ms  = $4,
        completed_at = NOW(),
        data         = $5,
        pr_url       = $6,
        pr_number    = $7
      WHERE id = $8
    `, [
      summary,
      JSON.stringify(allLog),
      process.env.LLM_MODEL,
      Date.now() - start,
      prResult ? JSON.stringify({ ...prResult, filesScanned: crawl.fetchedFiles }) : JSON.stringify({ filesScanned: crawl.fetchedFiles }),
      prResult?.prUrl ?? null,
      prResult?.prNumber ?? null,
      jobId,
    ])

    console.log(`✓ Job ${jobId} — ${allFindings.length} findings in ${Date.now() - start}ms`)
  } catch (err) {
    console.error(`✗ Job ${jobId}:`, err.message)
    await db(
      "UPDATE review_jobs SET status='failed', error_message=$1, completed_at=NOW() WHERE id=$2",
      [err.message, jobId]
    )
    throw err
  }
}, { connection, concurrency: 2 })

worker.on('completed', j => console.log(`✓ ${j.id}`))
worker.on('failed', (j, e) => console.error(`✗ ${j?.id}: ${e.message}`))
worker.on('error', err => {
  if (err.message.includes("Stream isn't writeable")) return // Ignore benign Redis offline queue errors
  console.error(`Worker error: ${err.message}`)
})

console.log('IntelliCodeRev agent worker running...')