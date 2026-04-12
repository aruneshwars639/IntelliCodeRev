export default function LoginPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f0f' }}>
      <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderRadius:12, padding:'40px 48px', textAlign:'center', maxWidth:400, width:'100%' }}>
        <div style={{ fontSize:28, fontWeight:700, marginBottom:8, color:'#f0f0f0' }}>IntelliCodeRev</div>
        <div style={{ color:'#666', fontSize:13, marginBottom:32 }}>
          AI-powered security scanner that automatically finds vulnerabilities and opens fix PRs.
        </div>
        <a href="/api/auth/github" style={{ display:'block' }}>
          <button className="btn-primary" style={{ width:'100%', padding:'10px 0', fontSize:14, borderRadius:8 }}>
            Connect with GitHub
          </button>
        </a>
        <div style={{ marginTop:20, fontSize:12, color:'#555' }}>
          IntelliCodeRev only requests <code style={{ color:'#818cf8' }}>repo</code> and <code style={{ color:'#818cf8' }}>read:user</code> scopes.
          It never merges code automatically.
        </div>
      </div>
    </div>
  )
}