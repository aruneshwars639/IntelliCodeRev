import { Router } from 'express'
import jwt         from 'jsonwebtoken'
import { query }                              from '../db/supabase.js'
import { getGithubToken, getGithubUser }      from '../services/github.js'
import { authMiddleware }                     from '../middleware/auth.js'

const router = Router()

// Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/auth/github/callback`,
    scope:        'repo read:user',
  })
  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

// GitHub callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'No code provided' })

    const githubToken = await getGithubToken(code)
    const githubUser  = await getGithubUser(githubToken)

    // Upsert user
    const { rows } = await query(`
      INSERT INTO users (github_id, github_login, avatar_url, name, github_token, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (github_id)
      DO UPDATE SET
        github_login = EXCLUDED.github_login,
        avatar_url   = EXCLUDED.avatar_url,
        name         = EXCLUDED.name,
        github_token = EXCLUDED.github_token,
        updated_at   = NOW()
      RETURNING id, github_login
    `, [githubUser.id, githubUser.login, githubUser.avatar_url, githubUser.name, githubToken])

    const user  = rows[0]
    const token = jwt.sign(
      { userId: user.id, githubLogin: user.github_login },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('OAuth error:', err)
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`)
  }
})

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  const { rows } = await query(
    'SELECT id, github_login, name, avatar_url FROM users WHERE id = $1',
    [req.user.userId]
  )
  res.json({ user: rows[0] ?? null })
})

export default router
