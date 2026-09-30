import { Router }                     from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { query }                      from '../db/supabase.js'
import { enqueueReviewJob }           from '../jobs/reviewQueue.js'

const router = Router()

function verifySignature(payload, signature) {
  const digest = 'sha256=' + createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch { return false }
}

router.post('/github', async (req, res) => {
  const sig = req.headers['x-hub-signature-256']
  if (!sig || !verifySignature(req.body, sig)) return res.status(401).send('Unauthorized')

  const event   = req.headers['x-github-event']
  const payload = JSON.parse(req.body.toString())

  if (!['push', 'pull_request'].includes(event)) return res.status(200).send('ok')

  const repoId = payload.repository?.id
  const branch = payload.ref?.replace('refs/heads/', '') ?? 'main'

  const { rows } = await query(
    'SELECT user_id, id, auto_review, default_branch FROM repos WHERE github_repo_id = $1',
    [repoId]
  )
  const repo = rows[0]

  if (!repo?.auto_review)                                   return res.status(200).send('ok')
  if (event === 'push' && branch !== repo.default_branch)  return res.status(200).send('ok')

  const { rows: jobs } = await query(`
    INSERT INTO review_jobs (user_id, repo_id, owner, repo, branch, status, trigger)
    VALUES ($1, $2, $3, $4, $5, 'pending', 'webhook')
    RETURNING *
  `, [
    repo.user_id,
    repo.id,
    payload.repository.owner.login,
    payload.repository.name,
    repo.default_branch,
  ])

  const job = jobs[0]
  await enqueueReviewJob({
    jobId:  job.id,
    owner:  payload.repository.owner.login,
    repo:   payload.repository.name,
    branch: repo.default_branch,
    userId: repo.user_id,
  })

  res.status(202).json({ jobId: job.id })
})

export default router
