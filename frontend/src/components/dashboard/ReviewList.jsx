const STATUS_STYLE = {
  pending:  { bg:'#1a1a1a', color:'#6b7280' },
  running:  { bg:'#2a1f00', color:'#f59e0b' },
  complete: { bg:'#0a1f0a', color:'#22c55e' },
  failed:   { bg:'#1f0a0a', color:'#ef4444' },
}

export default function ReviewList({ reviews = [], selected, onSelect }) {
  return (
    <div style={{ borderRight:'1px solid #1f1f1f', overflow:'auto', padding: 12, background:'#0f0f0f' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color:'#444', textTransform:'uppercase', letterSpacing:'.05em', padding:'4px 4px 10px' }}>
        Scan Jobs
      </div>

      {reviews.length === 0 && (
        <div style={{ padding: 24, textAlign:'center', color:'#444', fontSize: 13 }}>
          No scans yet. Enter a repo above and click "Scan repo".
        </div>
      )}

      {reviews.map(r => {
        const isSelected = selected?.id === r.id
        const s          = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
        const critical   = (r.findings ?? []).filter(f => f.severity === 'critical').length
        const warnings   = (r.findings ?? []).filter(f => f.severity === 'warning').length

        return (
          <div
            key={r.id}
            onClick={() => onSelect(r)}
            style={{
              padding:'10px 12px', borderRadius: 7, marginBottom: 5, cursor:'pointer',
              border: isSelected ? '1px solid #6366f1' : '1px solid #1f1f1f',
              background: isSelected ? '#1e1e2e' : '#161616',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 3 }}>
              <span style={{ fontWeight: 500, fontSize: 13, color:'#e2e2e2' }}>
                {r.owner}/{r.repo}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, padding:'1px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
                {r.status}
              </span>
            </div>

            <div style={{ fontSize: 12, color:'#555', marginBottom: 4 }}>
              {r.branch} · {r.trigger} · {new Date(r.created_at).toLocaleDateString()}
            </div>

            {r.status === 'complete' && (
              <div style={{ display:'flex', gap: 6 }}>
                {critical > 0 && (
                  <span style={{ fontSize: 11, padding:'1px 6px', borderRadius: 4, background:'#2a0a0a', color:'#ef4444' }}>
                    {critical} critical
                  </span>
                )}
                {warnings > 0 && (
                  <span style={{ fontSize: 11, padding:'1px 6px', borderRadius: 4, background:'#2a1a00', color:'#f59e0b' }}>
                    {warnings} warnings
                  </span>
                )}
                {critical === 0 && warnings === 0 && (
                  <span style={{ fontSize: 11, padding:'1px 6px', borderRadius: 4, background:'#0a1f0a', color:'#22c55e' }}>
                    clean
                  </span>
                )}
                {r.pr_url && (
                  <a href={r.pr_url} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, padding:'1px 6px', borderRadius: 4, background:'#1e1e2e', color:'#818cf8' }}>
                    PR #{r.pr_number}
                  </a>
                )}
              </div>
            )}

            {r.status === 'running' && (
              <div style={{ fontSize: 12, color:'#f59e0b' }}>Scanning...</div>
            )}

            {r.status === 'failed' && (
              <div style={{ fontSize: 12, color:'#ef4444' }}>Failed — {r.error_message?.slice(0,60)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
} 