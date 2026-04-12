/**
 * All GitHub API calls use native fetch — no axios dependency.
 */

// Exchange OAuth code for GitHub access token
export async function getGithubToken(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify({
      client_id:     process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description ?? data.error)
  return data.access_token
}

// Fetch authenticated GitHub user profile
export async function getGithubUser(token) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`)
  return res.json()
}

// Fetch repos for authenticated user
export async function getGithubRepos(token) {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
    },
  })
  if (!res.ok) throw new Error(`GitHub repos fetch failed: ${res.status}`)
  return res.json()
}

// Parse a GitHub PR URL into { owner, repo, prNumber }
export function parsePrUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) throw new Error(`Invalid GitHub PR URL: ${url}`)
  return {
    owner:    match[1],
    repo:     match[2],
    prNumber: parseInt(match[3], 10),
  }
}

// Parse a GitHub repo URL into { owner, repo }
export function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) throw new Error(`Invalid GitHub repo URL: ${url}`)
  return { owner: match[1], repo: match[2] }
}
