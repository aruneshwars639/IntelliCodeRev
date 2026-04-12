/**
 * Thin fetch wrapper — replaces axios entirely.
 * Automatically attaches JWT from localStorage,
 * throws on non-2xx responses, returns parsed JSON.
 */

function getToken() {
  try {
    const raw = localStorage.getItem('intelliCodeRev-auth')
    return raw ? JSON.parse(raw)?.state?.token : null
  } catch { return null }
}

async function request(path, options = {}) {
  const token   = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status })
  }

  // 204 No Content — return null
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body)   => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
}
