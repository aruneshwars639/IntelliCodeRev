import { useState, useEffect, useCallback } from 'react'
import { useAuthStore }   from '../hooks/useAuthStore.js'
import { api }            from '../lib/api.js'
import Sidebar            from '../components/dashboard/Sidebar.jsx'
import ReviewList         from '../components/dashboard/ReviewList.jsx'
import ReviewDetail       from '../components/review/ReviewDetail.jsx'

export default function DashboardPage() {
  const { user, logout }        = useAuthStore()
  const [repos,    setRepos]    = useState([])
  const [reviews,  setReviews]  = useState([])
  const [selected, setSelected] = useState(null)
  const [owner,    setOwner]    = useState('')
  const [repo,     setRepo]     = useState('')
  const [branch,   setBranch]   = useState('main')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const loadData = useCallback(async () => {
    const [repoData, reviewData] = await Promise.all([
      api.get('/repos'),
      api.get('/reviews'),
    ])
    setRepos(repoData.repos ?? [])
    setReviews(reviewData.reviews ?? [])
  }, [])

  useEffect(() => { loadData() }, [])

  async function handleScan(e) {
    e.preventDefault()
    if (!owner || !repo) return
    setLoading(true); setError(null)
    try {
      const { job } = await api.post('/reviews', { owner, repo, branch })
      setReviews(prev => [job, ...prev])
      pollJob(job.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function pollJob(jobId) {
    const iv = setInterval(async () => {
      try {
        const { review } = await api.get(`/reviews/${jobId}`)
        setReviews(prev => prev.map(r => r.id === jobId ? review : r))
        if (['complete','failed'].includes(review.status)) {
          clearInterval(iv)
          setSelected(review)
        }
      } catch { clearInterval(iv) }
    }, 4000)
  }

  async function selectReview(review) {
    const { review: full } = await api.get(`/reviews/${review.id}`)
    setSelected(full)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'100vh', overflow:'hidden', background:'#0f0f0f' }}>
      <Sidebar repos={repos} user={user} onLogout={logout} />

      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Scan trigger bar */}
        <form onSubmit={handleScan} style={{ display:'flex', gap:8, padding:'12px 20px', borderBottom:'1px solid #1f1f1f', background:'#111' }}>
          <input value={owner}  onChange={e => setOwner(e.target.value)}  placeholder="owner"  style={{ maxWidth:140 }} />
          <input value={repo}   onChange={e => setRepo(e.target.value)}   placeholder="repo"   style={{ maxWidth:180 }} />
          <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="branch" style={{ maxWidth:100 }} />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Scanning...' : 'Scan repo'}
          </button>
        </form>

        {error && (
          <div style={{ padding:'8px 20px', background:'#1f0a0a', color:'#ef4444', fontSize:12, borderBottom:'1px solid #3f1010' }}>
            {error}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flex:1, overflow:'hidden' }}>
          <ReviewList reviews={reviews} selected={selected} onSelect={selectReview} />
          <ReviewDetail review={selected} />
        </div>
      </div>
    </div>
  )
}