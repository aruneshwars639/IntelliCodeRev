import React            from 'react'
import ReactDOM         from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuthStore.js'

import LoginPage     from './pages/LoginPage.jsx'
import AuthCallback  from './pages/AuthCallback.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RepoPage      from './pages/RepoPage.jsx'
import ReviewPage    from './pages/ReviewPage.jsx'

import './index.css'

function Protected({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/repos" element={<Protected><RepoPage /></Protected>} />
        <Route path="/reviews/:id" element={<Protected><ReviewPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
