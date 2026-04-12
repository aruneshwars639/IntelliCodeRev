import { useNavigate, useLocation } from 'react-router-dom'

const NAV = [
  { label: 'Dashboard',    path: '/' },
  { label: 'Repositories', path: '/repos' },
]

export default function Sidebar({ repos = [], user, onLogout }) {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  return (
    <div style={{
      background:'#111', borderRight:'1px solid #1f1f1f',
      display:'flex', flexDirection:'column',
      height:'100vh', overflow:'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid #1f1f1f' }}>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing:'-0.3px', color:'#f0f0f0' }}>IntelliCodeRev</div>
        <div style={{ fontSize: 11, color:'#555', marginTop: 2 }}>AI security scanner</div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'8px 0' }}>
        {NAV.map(n => (
          <button key={n.path} onClick={() => navigate(n.path)} style={{
            display:'block', width:'100%', textAlign:'left',
            padding:'8px 16px', fontSize: 13, border:'none', borderRadius: 0,
            background: pathname === n.path ? '#1e1e2e' : 'transparent',
            fontWeight: pathname === n.path ? 500 : 400,
            color: pathname === n.path ? '#a5b4fc' : '#888',
            borderRight: pathname === n.path ? '2px solid #6366f1' : '2px solid transparent',
            cursor:'pointer',
          }}>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Connected repos */}
      {repos.length > 0 && (
        <div style={{ flex: 1, overflow:'auto', borderTop:'1px solid #1f1f1f', paddingTop: 8 }}>
          <div style={{ padding:'4px 16px 6px', fontSize: 11, color:'#444', textTransform:'uppercase', letterSpacing:'.05em' }}>
            Repos
          </div>
          {repos.map(r => (
            <div key={r.id} style={{ padding:'5px 16px', fontSize: 12, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {r.full_name}
              {r.auto_review && (
                <span style={{ marginLeft: 6, fontSize: 10, background:'#1e1e2e', color:'#818cf8', padding:'1px 5px', borderRadius: 3 }}>auto</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User + logout */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid #1f1f1f', fontSize: 12 }}>
        {user && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ color:'#666' }}>@{user.github_login}</span>
            <button onClick={onLogout} style={{ fontSize: 11, color:'#555', border:'none', background:'none', padding: 0, cursor:'pointer' }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}