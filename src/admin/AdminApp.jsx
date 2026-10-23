import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api, onAuthProblem } from './api'
import LoginPage from './LoginPage'
import { RecoverPage, ResetPage, VerifyPage } from './RecoveryPages'
import Layout from './Layout'
import Overview from './pages/Overview'
import Albums from './pages/Albums'
import AlbumDetail from './pages/AlbumDetail'
import VolunteerPage from './pages/VolunteerPage'
import SiteContentPage from './pages/SiteContentPage'
import NewsPage from './pages/NewsPage'
import ContactPage from './pages/ContactPage'
import AccountPage from './pages/AccountPage'
import PeoplePage from './pages/PeoplePage'
import FoiPage from './pages/FoiPage'
import MessagesPage from './pages/MessagesPage'
import PrivacyRequestsPage from './pages/PrivacyRequestsPage'
import './admin.css'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'checking', user: null })
  const navigate = useNavigate()

  const refresh = useCallback(async () => {
    try {
      const data = await api('/auth/me')
      if (data?.user) {
        setState({ status: 'in', user: data.user })
        return data.user
      }
      setState({ status: 'out', user: null })
      return null
    } catch {
      setState({ status: 'out', user: null })
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(
    () =>
      onAuthProblem((err) => {
        // The guard (RequireAuth) redirects to the login page and shows why.
        if (err.status === 401) setState({ status: 'out', user: null, reason: 'expired' })
        else navigate('/admin/dashboard/account', { replace: true })
      }),
    [navigate],
  )

  const login = async (username, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { username, password } })
    if (!data?.user) {
      throw new Error('Invalid login response from server.')
    }
    setState({ status: 'in', user: data.user })
    return data.user
  }
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setState({ status: 'out', user: null, reason: 'loggedOut' })
    }
  }

  return <AuthContext.Provider value={{ ...state, login, logout, refresh }}>{children}</AuthContext.Provider>
}

// Client-side guard for UX only; every admin API call is checked on the server.
function RequireAuth({ children }) {
  const { status, reason } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <div className="admin-boot">Checking your session…</div>
  if (status === 'out')
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: reason === 'loggedOut' ? undefined : location.pathname,
          loggedOut: reason === 'loggedOut',
          expired: reason === 'expired',
        }}
      />
    )
  return children
}

export default function AdminApp() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Admin · Katoto Project'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => {
      document.title = prev
      robots.remove()
    }
  }, [])

  return (
    <AuthProvider>
      <div className="admin">
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="recover" element={<RecoverPage />} />
          <Route path="reset" element={<ResetPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="albums" element={<Albums />} />
            <Route path="albums/:id" element={<AlbumDetail />} />
            <Route path="volunteer" element={<VolunteerPage />} />
            <Route path="content" element={<SiteContentPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="foi" element={<FoiPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="privacy" element={<PrivacyRequestsPage />} />
            <Route path="privacy/:id" element={<PrivacyRequestsPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}
