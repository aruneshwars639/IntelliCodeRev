import { Router } from 'express'
import { z }       from 'zod'
import { query }           from '../db/supabase.js'
import { enqueueReviewJob } from '../jobs/reviewQueue.js'

const router = Router()

// Trigger a new scan
router.post('/', async (req, res) => {
  const schema = z.object({
    owner:   z.string().min(1),
    repo:    z.string().min(1),
    branch:  z.string().default('main'),
    trigger: z.enum(['manual','batch','scheduled']).default('manual'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })

  const { owner, repo, branch, trigger } = parsed.data

  const { rows } = await query(`
    INSERT INTO review_jobs (user_id, owner, repo, branch, status, trigger)
    VALUES ($1, $2, $3, $4, 'pending', $5)
    RETURNING *
  `, [req.user.userId, owner, repo, branch, trigger])

  const job = rows[0]
  await enqueueReviewJob({ jobId: job.id, owner, repo, branch, userId: req.user.userId })

  res.status(202).json({ job })
})

// List all jobs for user
router.get('/', async (req, res) => {
  const { rows } = await query(`
    SELECT id, owner, repo, branch, status, trigger,
           summary, created_at, completed_at, data, pr_url, pr_number
    FROM review_jobs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [req.user.userId])
  res.json({ reviews: rows })
})

// Get single job with findings
router.get('/:id', async (req, res) => {
  const { rows: jobs } = await query(
    'SELECT * FROM review_jobs WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  )
  if (!jobs[0]) return res.status(404).json({ error: 'Not found' })

  const { rows: findings } = await query(
    'SELECT * FROM findings WHERE job_id = $1 ORDER BY severity, created_at',
    [req.params.id]
  )

  res.json({ review: { ...jobs[0], findings } })
})

export default router
