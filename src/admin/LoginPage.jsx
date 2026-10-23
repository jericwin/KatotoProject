import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react'
import logo from '../assets/katoto-logo-sm.webp'
import { useAuth } from './AdminApp'

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const userRef = useRef(null)
  const passRef = useRef(null)

  useEffect(() => {
    userRef.current?.focus()
  }, [])

  if (status === 'in') return <Navigate to="/admin/dashboard" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!username.trim()) found.username = 'Enter your username.'
    if (!password) found.password = 'Enter your password.'
    setErrors(found)
    setFormError('')
    if (found.username) return userRef.current?.focus()
    if (found.password) return passRef.current?.focus()
    setBusy(true)
    try {
      const user = await login(username.trim(), password)
      if (user?.mustChangePassword) {
        navigate('/admin/dashboard/account', { replace: true })
      } else {
        navigate(location.state?.from || '/admin/dashboard', { replace: true })
      }
    } catch (err) {
      setFormError(err.message)
      setIsLocked(err.code === 'ACCOUNT_LOCKED')
      setPassword('')
      passRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const notice = location.state?.expired
    ? 'Your session ended. Please sign in again.'
    : location.state?.loggedOut
      ? 'You have signed out.'
      : location.state?.changed
        ? location.state.changed
        : ''

  return (
    <main className="login">
      <div className="login__card">
        <img src={logo} alt="Katoto Project" className="login__logo" width="420" height="252" />
        <h1>Admin sign in</h1>
        <p className="login__sub">For authorized Katoto Project administrators only.</p>

        {notice && !formError && (
          <p className="admin-alert admin-alert--info" role="status">
            {notice}
          </p>
        )}
        {formError && (
          <div className="admin-alert admin-alert--error" role="alert">
            <span>{formError}</span>
            {isLocked && (
              <Link to="/admin/recover" className="a-btn a-btn--sm">
                Restore access
              </Link>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="a-field">
            <label htmlFor="login-user">Username</label>
            <input
              ref={userRef}
              id="login-user"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={errors.username ? 'true' : undefined}
              aria-describedby={errors.username ? 'login-user-err' : undefined}
            />
            {errors.username && (
              <p className="a-field__error" id="login-user-err">
                {errors.username}
              </p>
            )}
          </div>
          <div className="a-field">
            <label htmlFor="login-pass">Password</label>
            <div className="a-password">
              <input
                ref={passRef}
                id="login-pass"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errors.password ? 'true' : undefined}
                aria-describedby={errors.password ? 'login-pass-err' : undefined}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                <span className="visually-hidden">{show ? 'Hide password' : 'Show password'}</span>
              </button>
            </div>
            {errors.password && (
              <p className="a-field__error" id="login-pass-err">
                {errors.password}
              </p>
            )}
          </div>
          <button type="submit" className="btn login__submit" disabled={busy}>
            <LogIn aria-hidden="true" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="login__forgot">
          <Link to="/admin/recover">Forgot your password or locked out?</Link>
        </p>
        <a href="/" className="login__back">
          <ArrowLeft aria-hidden="true" /> Back to the website
        </a>
      </div>
    </main>
  )
}
