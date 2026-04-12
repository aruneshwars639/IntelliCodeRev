import { useState } from 'react'

const SEV = {
  critical: { bg:'#2a0a0a', color:'#ef4444', border:'#ef4444' },
  warning:  { bg:'#2a1a00', color:'#f59e0b', border:'#f59e0b' },
  info:     { bg:'#0a1020', color:'#60a5fa', border:'#3b82f6' },
}

export default function ReviewDetail({ review, fullPage = false }) {
  const [tab, setTab] = useState('findings')

  if (!review) return (
    <div style={{ padding: 40, color:'#444', fontSize: 13, textAlign:'center', background:'#0f0f0f' }}>
      Select a scan from the list to see results
    </div>
  )

  const findings  = review.findings ?? []
  const critical  = findings.filter(f => f.severity === 'critical').length
  const warnings  = findings.filter(f => f.severity === 'warning').length
  const withPatch = findings.filter(f => f.diff_patch)
  const agentLog  = review.agent_log ?? []

  const TABS = ['findings', 'patches', 'agent log', 'summary']

  return (
    <div style={{ padding: 16, overflow:'auto', height: fullPage ? 'auto' : '100%', background:'#0f0f0f' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color:'#f0f0f0' }}>{review.owner}/{review.repo}</div>
          <div style={{ fontSize: 12, color:'#555', marginTop: 2 }}>
            {review.branch} · {review.trigger} · {new Date(review.created_at).toLocaleString()}
          </div>
        </div>
        <StatusBadge status={review.status} />
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        <StatCard label="Critical"  value={critical} color="#ef4444" />
        <StatCard label="Warnings"  value={warnings}  color="#f59e0b" />
        <StatCard label="Files"     value={review.data?.filesScanned ?? 0} color="#818cf8" />
        <StatCard label="Duration"  value={review.duration_ms ? `${(review.duration_ms/1000).toFixed(1)}s` : '—'} />
      </div>

      {/* PR link */}
      {review.pr_url && (
        <div style={{ marginBottom: 12, padding:'8px 12px', background:'#1e1e2e', border:'1px solid #2e2e4e', borderRadius: 6, fontSize: 13 }}>
          Fix PR opened →{' '}
          <a href={review.pr_url} target="_blank" rel="noreferrer" style={{ color:'#818cf8', fontWeight: 500 }}>
            #{review.pr_number} on GitHub
          </a>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #1f1f1f', marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 12, padding:'6px 12px', border:'none', borderRadius: 0,
            background:'none', cursor:'pointer',
            color: tab === t ? '#e2e2e2' : '#555',
            fontWeight: tab === t ? 600 : 400,
            borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
          }}>
            {t} {t === 'findings' && findings.length > 0 ? `(${findings.length})` : ''}
          </button>
        ))}
      </div>

      {/* Findings tab */}
      {tab === 'findings' && (
        <div>
          {findings.length === 0 ? (
            <Empty status={review.status} />
          ) : findings.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
        </div>
      )}

      {/* Patches tab */}
      {tab === 'patches' && (
        <div>
          {withPatch.length === 0 ? (
            <div style={{ color:'#555', fontSize: 13, padding: 20, textAlign:'center' }}>
              No code patches generated
            </div>
          ) : withPatch.map((f, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6, color:'#e2e2e2' }}>{f.title}</div>
              <div style={{ fontSize: 11, color:'#555', marginBottom: 6 }}>{f.file}</div>
              <pre style={{
                fontFamily:'Menlo,Monaco,monospace', fontSize: 11,
                background:'#141414', color:'#d4d4d4',
                borderRadius: 6, padding: 12, overflow:'auto',
                lineHeight: 1.6, border:'1px solid #1f1f1f',
              }}>
                {(f.diff_patch ?? '').split('\n').map((line, li) => (
                  <span key={li} style={{
                    display:'block',
                    color: line.startsWith('+') ? '#4ade80' : line.startsWith('-') ? '#f87171' : '#888',
                  }}>{line}</span>
                ))}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Agent log tab */}
      {tab === 'agent log' && (
        <div>
          {agentLog.length === 0 ? (
            <div style={{ color:'#555', fontSize: 13, padding: 20, textAlign:'center' }}>No agent log yet</div>
          ) : agentLog.map((entry, i) => (
            <div key={i} style={{
              padding:'8px 10px', marginBottom: 5,
              background:'#161616', borderRadius: 6, border:'1px solid #1f1f1f',
              fontFamily:'monospace', fontSize: 11, color:'#666',
            }}>
              <span style={{ fontWeight: 600, color:'#a5b4fc' }}>{entry.phase}</span>
              {' · '}{entry.timestamp?.slice(11,19)}
              {entry.confirmed !== undefined && (
                <span style={{ marginLeft: 8, color:'#22c55e' }}>{entry.confirmed} confirmed</span>
              )}
              {entry.rejected !== undefined && entry.rejected > 0 && (
                <span style={{ marginLeft: 8, color:'#ef4444' }}>{entry.rejected} rejected</span>
              )}
              {entry.valid !== undefined && (
                <span style={{ marginLeft: 8, color:'#60a5fa' }}>{entry.valid} valid syntax</span>
              )}
              {entry.prUrl && (
                <span style={{ marginLeft: 8 }}>→ <a href={entry.prUrl} target="_blank" rel="noreferrer">{entry.prUrl}</a></span>
              )}
              {entry.error && (
                <span style={{ marginLeft: 8, color:'#ef4444' }}>error: {entry.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <div>
          {review.summary ? (
            <div style={{ fontSize: 13, lineHeight: 1.7, color:'#aaa', whiteSpace:'pre-wrap' }}>
              {review.summary}
            </div>
          ) : (
            <div style={{ color:'#555', fontSize: 13, textAlign:'center', padding: 20 }}>No summary yet</div>
          )}
          {review.model_used && (
            <div style={{ marginTop: 16, fontSize: 11, color:'#444' }}>Model: {review.model_used}</div>
          )}
        </div>
      )}
    </div>
  )
}

function FindingCard({ finding }) {
  const s = SEV[finding.severity] ?? SEV.info
  return (
    <div style={{
      padding:'10px 12px', marginBottom: 8,
      borderLeft:`3px solid ${s.border}`,
      background:'#141414', borderRadius:'0 6px 6px 0',
      border:`1px solid #1f1f1f`,
      borderLeft:`3px solid ${s.border}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding:'1px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
          {finding.severity}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color:'#e2e2e2' }}>{finding.title}</span>
        {finding.cwe && (
          <span style={{ fontSize: 11, color:'#555', marginLeft:'auto' }}>{finding.cwe}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color:'#777', marginBottom: finding.suggestion ? 4 : 0 }}>
        {finding.file && <span style={{ color:'#555', marginRight: 6 }}>{finding.file}{finding.line_start ? `:${finding.line_start}` : ''} —</span>}
        {finding.description}
      </div>
      {finding.suggestion && (
        <div style={{ fontSize: 12, color:'#22c55e', marginTop: 4 }}>
          Fix: {finding.suggestion}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:'#161616', borderRadius: 6, padding:'8px 10px', border:'1px solid #1f1f1f' }}>
      <div style={{ fontSize: 11, color:'#555' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color ?? '#e2e2e2', marginTop: 1 }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:  ['#1a1a1a','#6b7280'],
    running:  ['#2a1f00','#f59e0b'],
    complete: ['#0a1f0a','#22c55e'],
    failed:   ['#1f0a0a','#ef4444'],
  }
  const [bg, color] = map[status] ?? map.pending
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding:'2px 10px', borderRadius: 20, background: bg, color }}>
      {status}
    </span>
  )
}

function Empty({ status }) {
  if (status === 'running') return <div style={{ color:'#f59e0b', fontSize: 13, textAlign:'center', padding: 24 }}>Scanning in progress...</div>
  if (status === 'failed')  return <div style={{ color:'#ef4444', fontSize: 13, textAlign:'center', padding: 24 }}>Scan failed</div>
  return <div style={{ color:'#22c55e', fontSize: 13, textAlign:'center', padding: 24 }}>No vulnerabilities found — clean!</div>
}