import { Octokit } from '@octokit/rest'
import pg from 'pg'

const { Pool } = pg

// Agents maintain their own pool — avoids circular imports
function sanitizeUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch { return url }
}

function getPool() {
  const rawUrl = process.env.DATABASE_URL
  const isLocal = rawUrl?.includes("localhost") || process.env.DB_SSL === "false"
  return new Pool({
    connectionString: isLocal ? rawUrl : sanitizeUrl(rawUrl),
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
  })
}

const SCANNABLE = [
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.java', '.rb', '.php', '.cs', '.cpp', '.c', '.vue', '.svelte',
]

const SKIP = [
  /node_modules\//, /\.git\//, /dist\//, /build\//,
  /\.min\.js$/, /\.map$/, /package-lock\.json$/,
  /yarn\.lock$/, /\.lock$/, /__pycache__\//,
  /\.test\./, /\.spec\./, /\/tests?\//, /\/__(tests?|mocks?)__\//,
]

// Files matching these patterns scanned first — highest vuln density
const HIGH_PRIORITY = [
  /route/i, /controller/i, /handler/i, /middleware/i,
  /auth/i, /login/i, /user/i, /model/i, /\/db\//i, /database/i,
  /query/i, /sql/i, /api/i, /server\.[jt]s/i, /app\.[jt]s/i, /index\.[jt]s/i,
  /upload/i, /exec/i, /shell/i, /crypto/i, /password/i,
  /session/i, /token/i, /jwt/i, /config/i,
]

function prioritizeFiles(files) {
  const high = files.filter(f => HIGH_PRIORITY.some(p => p.test(f.path)))
  const rest = files.filter(f => !HIGH_PRIORITY.some(p => p.test(f.path)))
  return [...high, ...rest]
}

async function getOctokit(userId, externalPool) {
  const pool = externalPool ?? getPool()
  const { rows } = await pool.query(
    'SELECT github_token FROM users WHERE id = $1', [userId]
  )
  return new Octokit({
    auth: rows[0]?.github_token,
    log: {
      debug: () => { },
      info: () => { },
      warn: () => { },
      error: console.error
    },
    request: {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  })
}

export async function crawlRepo({ owner, repo, branch = 'main', userId, pool }) {
  const octokit = await getOctokit(userId, pool)

  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: branch, recursive: 'true',
  })

  const raw = tree.tree
    .filter(f => f.type === 'blob')
    .filter(f => SCANNABLE.some(ext => f.path.endsWith(ext)))
    .filter(f => !SKIP.some(p => p.test(f.path)))


  const scannable = prioritizeFiles(raw).slice(0, 80)

  console.log(`Crawling ${scannable.length} files in ${owner}/${repo}@${branch} (${raw.length} total eligible)`)
  console.log(`High-priority files: ${scannable.filter(f => HIGH_PRIORITY.some(p => p.test(f.path))).length}`)

  const files = []
  for (let i = 0; i < scannable.length; i += 10) {
    const batch = scannable.slice(i, i + 10)
    const results = await Promise.all(batch.map(async f => {
      try {
        const { data } = await octokit.git.getBlob({ owner, repo, file_sha: f.sha })
        const content = Buffer.from(data.content, 'base64').toString('utf8')
        return { path: f.path, content: content.slice(0, 12000), sha: f.sha }
      } catch { return null }
    }))
    files.push(...results.filter(Boolean))
  }

  return { owner, repo, branch, totalFiles: scannable.length, fetchedFiles: files.length, files }
}

export async function fetchSingleFile({ owner, repo, path, ref = 'main', userId }) {
  const octokit = await getOctokit(userId)

  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: ref, recursive: 'true',
  })

  const fileNode = tree.tree.find(f => f.path === path)
  if (!fileNode) throw new Error(`File ${path} not found in repository tree`)

  const { data } = await octokit.git.getBlob({ owner, repo, file_sha: fileNode.sha })
  const content = Buffer.from(data.content, 'base64').toString('utf8')

  return { path, content, sha: fileNode.sha }
}