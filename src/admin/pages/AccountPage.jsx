import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, UserRound, MailCheck, ShieldCheck, ShieldAlert, X } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AdminApp'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast } from '../ui'

const sqlDate = (s) => new Date(`${s.replace(' ', 'T')}Z`)
const fmt = (s) => (s ? sqlDate(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never')
const until = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const EVENT_LABELS = {
  login_failed: 'Failed sign-in',
  login_blocked_locked: 'Sign-in blocked (account locked)',
  account_locked: 'Account locked',
  lock_notification_sent: 'Security alert emailed',
  lock_notification_failed: 'Security alert email failed',
  lock_notification_not_sent: 'Security alert not emailed',
  recovery_requested: 'Recovery link requested',
  recovery_throttled: 'Recovery email limit reached',
  recovery_email_sent: 'Recovery email sent',
  recovery_email_failed: 'Recovery email failed',
  recovery_email_not_sent: 'Recovery email not sent',
  password_reset: 'Password reset',
  account_unlocked: 'Account unlocked',
  verification_failed: 'Verification failed',
  password_change_requested: 'Password change requested',
  password_change_verification_sent: 'Password verification emailed',
  password_change_verification_failed: 'Password verification email failed',
  password_change_cancelled: 'Password change cancelled',
  password_changed: 'Password changed',
  password_change_confirmation_sent: 'Password change confirmation emailed',
  username_change_requested: 'Username change requested',
  username_change_verification_sent: 'Username verification emailed',
  username_change_verification_failed: 'Username verification email failed',
  username_change_cancelled: 'Username change cancelled',
  username_changed: 'Username changed',
  username_change_confirmation_sent: 'Username change confirmation emailed',
  reset_confirmation_sent: 'Reset confirmation emailed',
  password_rehashed: 'Password storage upgraded',
  unauthorized_request: 'Blocked request without sign-in',
  request_forbidden: 'Blocked cross-site or malformed request',
  upload_rejected: 'Upload rejected',
}
const WARN_EVENTS = /failed|(^|_)locked|blocked|throttled|not_sent|unauthorized|forbidden|rejected/

function PendingNotice({ pending, label, onCancel }) {
  if (!pending) return null
  return (
    <div className="admin-alert admin-alert--info" role="status">
      <MailCheck aria-hidden="true" />
      <span>
        <strong>Verification pending.</strong> We emailed a confirmation link for {label}. Nothing changes until it is opened
        and confirmed. The link expires at {until(pending.expiresAt)}.
      </span>
      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={onCancel}>
        <X aria-hidden="true" /> Cancel change
      </button>
    </div>
  )
}

function ChangePassword({ data, reload }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const pending = (data?.pending || []).find((p) => p.purpose === 'password_change')

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.currentPassword) found.currentPassword = 'Enter your current password.'
    if (form.newPassword.length < 12) found.newPassword = 'Use at least 12 characters.'
    if (form.newPassword !== form.confirm) found.confirm = 'The passwords don’t match.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const res = await api('/auth/password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      toast(res.sentTo ? `Verification email sent to ${res.sentTo}. Open the link to finish.` : (res.message || 'Password changed.'))
      reload()
    } catch (err) {
      setErrors(err.errors || {})
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-form" onSubmit={submit} noValidate aria-labelledby="change-pw">
      <h2 className="a-h2" id="change-pw">
        <KeyRound aria-hidden="true" className="a-h2__icon" /> Change password
      </h2>
      <PendingNotice
        pending={pending}
        label="a new password"
        onCancel={async () => {
          await api('/auth/pending/password', { method: 'DELETE' })
          toast('Pending password change cancelled.')
          reload()
        }}
      />
      <p className="a-muted">
        Enter your current password and the new one. We then email a confirmation link to {data.account.email || 'the registered email'}; the
        password changes only after you confirm, and every session is signed out.
      </p>
      <Field label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`At least 12 characters, mixing three of: lowercase, uppercase, numbers, symbols. Must not contain the username (${user?.username}).`}
        value={form.newPassword}
        onChange={set('newPassword')}
        error={errors.newPassword}
      />
      <Field label="Repeat new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      <div className="a-form__actions">
        <button type="submit" className="a-btn" disabled={busy || !data.email.configured}>
          <MailCheck aria-hidden="true" /> {busy ? 'Sending…' : 'Send verification email'}
        </button>
      </div>
    </form>
  )
}

function ChangeUsername({ data, reload }) {
  const toast = useToast()
  const [form, setForm] = useState({ newUsername: '', currentPassword: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const pending = data.pending.find((p) => p.purpose === 'username_change')

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/i.test(form.newUsername.trim()))
      found.newUsername = 'Use 3–32 letters, numbers, dots, dashes, or underscores, starting with a letter or number.'
    if (!form.currentPassword) found.currentPassword = 'Enter your current password.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const res = await api('/auth/username', { method: 'POST', body: { newUsername: form.newUsername.trim(), currentPassword: form.currentPassword } })
      setForm({ newUsername: '', currentPassword: '' })
      toast(`Verification email sent to ${res.sentTo}. Open the link to finish.`)
      reload()
    } catch (err) {
      setErrors(err.errors || {})
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-form" onSubmit={submit} noValidate aria-labelledby="change-user">
      <h2 className="a-h2" id="change-user">
        <UserRound aria-hidden="true" className="a-h2__icon" /> Change username
      </h2>
      <PendingNotice
        pending={pending}
        label={`the username “${pending?.newUsername}”`}
        onCancel={async () => {
          await api('/auth/pending/username', { method: 'DELETE' })
          toast('Pending username change cancelled.')
          reload()
        }}
      />
      <p className="a-muted">
        Current username: <strong>{data.account.username}</strong>. The confirmation link goes to the registered email, not to a new
        address.
      </p>
      <Field label="New username" autoComplete="off" value={form.newUsername} onChange={set('newUsername')} error={errors.newUsername} maxLength={32} />
      <Field label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <div className="a-form__actions">
        <button type="submit" className="a-btn" disabled={busy || !data.email.configured || data.account.mustChangePassword}>
          <MailCheck aria-hidden="true" /> {busy ? 'Sending…' : 'Send verification email'}
        </button>
      </div>
      {data.account.mustChangePassword && <p className="a-muted">Change the initial password first.</p>}
    </form>
  )
}

export default function AccountPage() {
  const { status, data, error, reload } = useAsync(() => api('/auth/security'), [])
  if (status === 'loading' && !data) return <Loading />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />
  const { account, email } = data

  return (
    <>
      <PageHeader title="Account & security" description={`Signed in as ${account.username}.`} />

      {account.mustChangePassword && (
        <p className="admin-alert admin-alert--warn" role="alert">
          You’re using the initial password from setup. Choose a new one now; the initial password must not be used once the site is
          public.
        </p>
      )}
      {!email.configured || !email.linksConfigured ? (
        <p className="admin-alert admin-alert--error" role="alert">
          Email isn’t fully set up on the server ({!email.configured ? 'SMTP settings missing' : 'APP_BASE_URL missing'}), so password and
          username changes and account recovery can’t send their links. The technical administrator can reset the password with “npm run
          admin:password” on the server.
        </p>
      ) : null}

      <section className="a-card" aria-labelledby="sec-status">
        <h2 className="a-h2" id="sec-status">
          <ShieldCheck aria-hidden="true" className="a-h2__icon" /> Security status
        </h2>
        <dl className="a-pr-facts a-sec-facts">
          <div>
            <dt>Account</dt>
            <dd>
              <span className="a-badge a-badge--live">Active, not locked</span>
            </dd>
          </div>
          <div>
            <dt>Registered email</dt>
            <dd>{account.hasEmail ? account.email : <span className="a-badge a-badge--warn">None (set ADMIN_EMAIL)</span>}</dd>
          </div>
          <div>
            <dt>Failed sign-ins</dt>
            <dd>
              {account.failedAttempts} of {account.maxFailedAttempts} in a row
              {account.lastFailedAt && <span className="a-muted"> · last {fmt(account.lastFailedAt)}</span>}
            </dd>
          </div>
          <div>
            <dt>Last locked</dt>
            <dd>{fmt(account.lockedAt)}</dd>
          </div>
          <div>
            <dt>Password changed</dt>
            <dd>{fmt(account.passwordChangedAt)}</dd>
          </div>
          <div>
            <dt>Email alerts</dt>
            <dd>{email.configured ? 'On' : 'Off'}</dd>
          </div>
        </dl>
      </section>

      <div className="a-split a-split--even">
        <ChangePassword data={data} reload={reload} />
        <ChangeUsername data={data} reload={reload} />
      </div>

      <section className="a-card a-help" aria-labelledby="sec-recovery">
        <h2 className="a-h2" id="sec-recovery">
          <ShieldAlert aria-hidden="true" className="a-h2__icon" /> If you’re locked out
        </h2>
        <ul>
          <li>After {account.maxFailedAttempts} wrong passwords in a row, the account locks and every session ends. Even the correct password won’t work until access is restored.</li>
          <li>A security alert goes to the registered email. It contains no password or link to reset it.</li>
          <li>
            Go to <Link to="/admin/recover">/admin/recover</Link>, enter the username or registered email, and open the single-use link (valid{' '}
            {email.tokenMinutes} minutes) to choose a new password. That unlocks the account.
          </li>
          <li>If email isn’t working, someone with access to the server can run <code>npm run admin:password</code>.</li>
        </ul>
      </section>

      <section className="a-card" aria-labelledby="sec-log">
        <h2 className="a-h2" id="sec-log">
          Security log
        </h2>
        <p className="a-muted">The last 100 events. No passwords, links, or IP addresses are recorded. Entries are deleted after {data.retentionDays} days.</p>
        {(data?.events || []).length === 0 ? (
          <p className="a-empty">No security events yet.</p>
        ) : (
          <ol className="a-pr-log a-sec-log">
            {(data?.events || []).map((e) => (
              <li key={e.id} className={WARN_EVENTS.test(e.event) ? 'is-warn' : ''}>
                <time>{fmt(e.at)}</time>
                <span>
                  <strong>{EVENT_LABELS[e.event] || e.event}</strong>
                  {e.detail && <span className="a-muted"> · {e.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="a-card" aria-labelledby="sec-activity">
        <h2 className="a-h2" id="sec-activity">
          Recent admin changes
        </h2>
        <p className="a-muted">The last 50 changes made in the admin (the action only, not the content).</p>
        {(data?.activity || []).length === 0 ? (
          <p className="a-empty">No changes recorded yet.</p>
        ) : (
          <ol className="a-pr-log">
            {(data?.activity || []).map((e) => (
              <li key={e.id}>
                <time>{fmt(e.at)}</time>
                <span>
                  <code>{e.detail}</code>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
