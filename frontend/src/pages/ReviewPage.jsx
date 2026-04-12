import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api }          from '../lib/api.js'
import ReviewDetail     from '../components/review/ReviewDetail.jsx'

export default function ReviewPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/reviews/${id}`)
      .then(d => setReview(d.review))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!review || review.status !== 'running') return
    const iv = setInterval(async () => {
      const d = await api.get(`/reviews/${id}`)
      setReview(d.review)
      if (['complete','failed'].includes(d.review.status)) clearInterval(iv)
    }, 4000)
    return () => clearInterval(iv)
  }, [review?.status])

  if (loading) return <div style={{ padding: 40, color:'#555' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 900, margin:'0 auto', padding: 24, background:'#0f0f0f', minHeight:'100vh' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: 16, fontSize: 13 }}>
        ← Back to dashboard
      </button>
      <ReviewDetail review={review} fullPage />
    </div>
  )
}