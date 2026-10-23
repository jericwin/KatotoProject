import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, MailCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import logo from '../assets/katoto-logo-sm.webp'
import { api } from './api'
import { useAuth } from './AdminApp'

// Pages reached from emailed links. The single-use token travels in the URL
// fragment (#token=…), which browsers never send to servers or in the Referer
// header. It is read once and then removed from the address bar and history.
function useFragmentToken() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '')
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
  return token
}

function Card({ title, children }) {
  return (
    <main className="login">
      <div className="login__card">
        <img src={logo} alt="Katoto Project" className="login__logo" width="420" height="252" />
        <h1>{title}</h1>
        {children}
        <Link to="/admin/login" className="login__back">
          <ArrowLeft aria-hidden="true" /> Back to sign in
        </Link>
      </div>
    </main>
  )
}

const until = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function PasswordField({ id, label, value, onChange, error, hint, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <div className="a-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="a-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <div className="a-password">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined}
          autoFocus={autoFocus}
        />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          <span className="visually-hidden">{show ? 'Hide password' : 'Show password'}</span>
        </button>
      </div>
      {error && (
        <p className="a-field__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  )
}

const PASSWORD_HINT = 'At least 12 characters, mixing three of: lowercase, uppercase, numbers, symbols. Must not contain the username.'

// --- /admin/recover: request a recovery link --------------------------------------
export function RecoverPage() {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return setError('Enter the admin username or registered email address.')
    setBusy(true)
    setError('')
    try {
      const res = await api('/auth/recovery', { method: 'POST', body: { identifier: identifier.trim() } })
      setMessage(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Restore admin access">
      {message ? (
        <div className="admin-alert admin-alert--info" role="status">
          <MailCheck aria-hidden="true" />
          <span>{message} Check the inbox (and spam folder) of the registered email.</span>
        </div>
      ) : (
        <>
          <p className="login__sub">
            Use this if you forgot the password or the account was locked. A single-use link to choose a new password is sent
            to the account’s registered email address. The account unlocks only after the new password is set.
          </p>
          {error && (
            <p className="admin-alert admin-alert--error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submit} noValidate>
            <div className="a-field">
              <label htmlFor="recover-id">Admin username or registered email</label>
              <input
                id="recover-id"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn login__submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send recovery link'}
            </button>
          </form>
        </>
      )}
    </Card>
  )
}

// --- /admin/reset#token=…: choose a new password ----------------------------------
export function ResetPage() {
  const token = useFragmentToken()
  const [state, setState] = useState(token ? 'checking' : 'invalid') // checking | ready | done | invalid | expired | used | error
  const [problem, setProblem] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (!token || checked.current) return
    checked.current = true
    api('/auth/recovery/check', { method: 'POST', body: { token } })
      .then((r) => {
        setExpiresAt(r.expiresAt)
        setState('ready')
      })
      .catch((err) => {
        setProblem(err.message)
        setState({ TOKEN_EXPIRED: 'expired', TOKEN_USED: 'used' }[err.code] || 'invalid')
      })
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (pw.length < 12) found.newPassword = 'Use at least 12 characters.'
    if (pw !== pw2) found.confirm = 'The passwords don’t match.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await api('/auth/recovery/complete', { method: 'POST', body: { token, newPassword: pw } })
      setState('done')
    } catch (err) {
      if (err.errors?.newPassword) setErrors(err.errors)
      else {
        setProblem(err.message)
        setState({ TOKEN_EXPIRED: 'expired', TOKEN_USED: 'used' }[err.code] || 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Choose a new password">
      {state === 'checking' && <p className="login__sub">Checking the link…</p>}
      {['invalid', 'expired', 'used', 'error'].includes(state) && (
        <div className="admin-alert admin-alert--error" role="alert">
          <ShieldAlert aria-hidden="true" />
          <span>{problem || 'This link isn’t valid.'}</span>
          <Link to="/admin/recover" className="a-btn a-btn--sm">
            Request a new link
          </Link>
        </div>
      )}
      {state === 'done' && (
        <div className="admin-alert admin-alert--info" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>Your password was changed and the account is unlocked. Every other session was signed out. A confirmation email is on its way.</span>
          <Link to="/admin/login" className="a-btn a-btn--sm">
            Sign in
          </Link>
        </div>
      )}
      {state === 'ready' && (
        <>
          <p className="login__sub">
            This link works once{expiresAt ? ` and expires at ${until(expiresAt)}` : ''}. Setting the password unlocks the account.
          </p>
          <form onSubmit={submit} noValidate>
            <PasswordField id="reset-pw" label="New password" hint={PASSWORD_HINT} value={pw} onChange={setPw} error={errors.newPassword} autoFocus />
            <PasswordField id="reset-pw2" label="Repeat new password" value={pw2} onChange={setPw2} error={errors.confirm} />
            <button type="submit" className="btn login__submit" disabled={busy}>
              <KeyRound aria-hidden="true" /> {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </>
      )}
    </Card>
  )
}

// --- /admin/verify#token=…: confirm a password or username change -------------------
export function VerifyPage() {
  const token = useFragmentToken()
  const { status: authStatus, logout } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState(token ? 'checking' : 'invalid') // checking | ready | done | invalid | expired | used | error
  const [info, setInfo] = useState(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const checked = useRef(false)

  useEffect(() => {
    if (!token || checked.current) return
    checked.current = true
    api('/auth/verify/check', { method: 'POST', body: { token } })
      .then((r) => {
        setInfo(r)
        setState('ready')
      })
      .catch((err) => {
        setProblem(err.message)
        setState({ TOKEN_EXPIRED: 'expired', TOKEN_USED: 'used' }[err.code] || 'invalid')
      })
  }, [token])

  const confirm = async () => {
    setBusy(true)
    try {
      const r = await api('/auth/verify', { method: 'POST', body: { token } })
      setInfo(r)
      setState('done')
      // The server ended every session, including this one.
      if (authStatus === 'in') await logout().catch(() => {})
    } catch (err) {
      setProblem(err.message)
      setState({ TOKEN_EXPIRED: 'expired', TOKEN_USED: 'used' }[err.code] || 'error')
    } finally {
      setBusy(false)
    }
  }

  const isPassword = info?.purpose === 'password_change'
  const what = isPassword ? 'password' : 'username'

  return (
    <Card title="Confirm account change">
      {state === 'checking' && <p className="login__sub">Checking the link…</p>}
      {['invalid', 'expired', 'used', 'error'].includes(state) && (
        <div className="admin-alert admin-alert--error" role="alert">
          <ShieldAlert aria-hidden="true" />
          <span>
            {problem || 'This link isn’t valid.'} {state === 'expired' && 'Nothing was changed. Start the change again from Account & security.'}
          </span>
        </div>
      )}
      {state === 'ready' && (
        <>
          <p className="login__sub">
            {isPassword ? (
              <>Confirm the new admin password you chose. </>
            ) : (
              <>
                Confirm changing the admin username to <strong>{info.newUsername}</strong>.{' '}
              </>
            )}
            Every signed-in session will end, and you’ll sign in again with the new {what}. This link expires at {until(info.expiresAt)}.
          </p>
          <button type="button" className="btn login__submit" onClick={confirm} disabled={busy}>
            <CheckCircle2 aria-hidden="true" /> {busy ? 'Confirming…' : `Confirm new ${what}`}
          </button>
          <p className="login__forgot">If you didn’t ask for this change, close this page; nothing will change.</p>
        </>
      )}
      {state === 'done' && (
        <div className="admin-alert admin-alert--info" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>
            {info?.purpose === 'password_change' ? 'Password changed successfully.' : `Username changed to “${info?.newUsername}”.`} All sessions were signed
            out. A confirmation email is on its way.
          </span>
          <button
            type="button"
            className="a-btn a-btn--sm"
            onClick={() =>
              navigate('/admin/login', { replace: true, state: { changed: `Your ${what} was changed. Sign in with the new ${what}.` } })
            }
          >
            Sign in
          </button>
        </div>
      )}
    </Card>
  )
}
