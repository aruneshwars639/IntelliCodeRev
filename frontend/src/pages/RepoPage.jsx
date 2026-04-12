import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { api }                 from '../lib/api.js'

export default function RepoPage() {
  const [repos,   setRepos]   = useState([])
  const [syncing, setSyncing] = useState(false)
  const [msg,     setMsg]     = useState(null)
  const navigate              = useNavigate()

  useEffect(() => {
    api.get('/repos').then(d => setRepos(d.repos ?? []))
  }, [])

  async function syncRepos() {
    setSyncing(true); setMsg(null)
    try {
      const d = await api.post('/repos/sync', {})
      setRepos(d.repos ?? [])
      setMsg(`Synced ${d.synced} repos from GitHub`)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function toggleAutoReview(repo) {
    const updated = await api.patch(`/repos/${repo.id}/auto-review`, {
      auto_review: !repo.auto_review,
    })
    setRepos(prev => prev.map(r => r.id === repo.id ? updated.repo : r))
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color:'#f0f0f0' }}>Repositories</h1>
        <div style={{ display:'flex', gap: 8 }}>
          <button onClick={() => navigate('/')}>← Dashboard</button>
          <button className="btn-primary" onClick={syncRepos} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync from GitHub'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding:'8px 12px', background:'#0a1f0a', color:'#22c55e', borderRadius: 6, marginBottom: 16, fontSize: 13, border:'1px solid #1a3f1a' }}>
          {msg}
        </div>
      )}

      <div style={{ fontSize: 12, color:'#555', marginBottom: 16 }}>
        Enable "Auto-review" to automatically scan a repo whenever a push or PR is detected.
      </div>

      {repos.length === 0 && (
        <div style={{ padding: 40, textAlign:'center', color:'#444', background:'#161616', borderRadius: 8, border:'1px solid #1f1f1f' }}>
          No repos connected yet. Click "Sync from GitHub" to import your repos.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
        {repos.map(repo => (
          <div key={repo.id} style={{
            background:'#161616', border:'1px solid #1f1f1f',
            borderRadius: 8, padding:'14px 16px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color:'#e2e2e2' }}>
                {repo.full_name}
                {repo.private && (
                  <span style={{ marginLeft: 8, fontSize: 11, background:'#1a1a1a', color:'#555', padding:'1px 6px', borderRadius: 4 }}>
                    private
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color:'#555', marginTop: 3 }}>
                default branch: {repo.default_branch}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'#888', cursor:'pointer' }}>
                <input
                  type="checkbox"
                  checked={repo.auto_review ?? false}
                  onChange={() => toggleAutoReview(repo)}
                />
                Auto-review
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}