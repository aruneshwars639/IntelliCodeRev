import { Router } from 'express'
import { query }          from '../db/supabase.js'
import { getGithubRepos } from '../services/github.js'

const router = Router()

// List repos for current user
router.get('/', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM repos WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.userId]
  )
  res.json({ repos: rows })
})

// Sync repos from GitHub
router.post('/sync', async (req, res) => {
  const { rows: users } = await query(
    'SELECT github_token FROM users WHERE id = $1',
    [req.user.userId]
  )
  const ghRepos = await getGithubRepos(users[0].github_token)

  let synced = 0
  for (const r of ghRepos) {
    await query(`
      INSERT INTO repos (user_id, github_repo_id, full_name, owner, name, private, default_branch)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (github_repo_id)
      DO UPDATE SET
        full_name      = EXCLUDED.full_name,
        default_branch = EXCLUDED.default_branch,
        private        = EXCLUDED.private
    `, [req.user.userId, r.id, r.full_name, r.owner.login, r.name, r.private, r.default_branch])
    synced++
  }

  const { rows } = await query(
    'SELECT * FROM repos WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.userId]
  )
  res.json({ synced, repos: rows })
})

// Toggle auto-review
router.patch('/:id/auto-review', async (req, res) => {
  const { auto_review } = req.body
  const { rows } = await query(
    'UPDATE repos SET auto_review = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [auto_review, req.params.id, req.user.userId]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Repo not found' })
  res.json({ repo: rows[0] })
})

export default router
