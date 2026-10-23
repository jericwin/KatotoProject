import { Router } from 'express'
import { db, transaction } from '../db.js'
import { config } from '../config.js'
import { hashPassword, validateNewPassword } from '../passwords.js'
import { createSession, destroySession, loadUser, loginLimiter, requireAdmin, verifyOrigin } from '../auth.js'
import { mailEnabled } from '../mailer.js'
import {
  LOCKED_MESSAGE,
  MAX_FAILED_LOGINS,
  PURPOSES,
  TOKEN_MINUTES,
  audit,
  checkPassword,
  consumeToken,
  createToken,
  deliver,
  failUnknownUser,
  inspectToken,
  invalidateTokens,
  maskEmail,
  recentTokenCount,
  tokenLink,
  windowLimiter,
} from '../security.js'

const router = Router()
router.use(verifyOrigin)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const GENERIC = 'Incorrect username or password.'
const locked = (res) => res.status(423).json({ error: LOCKED_MESSAGE, code: 'ACCOUNT_LOCKED' })
const findUser = (username) =>
  db.prepare('SELECT id, username, email, must_change_password FROM users WHERE username = ?').get(username)

// --- Sign in ---------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!username || !password) return res.status(400).json({ error: 'Enter your username and password.' })
  if (username.length > 100 || password.length > 200) return res.status(400).json({ error: GENERIC })

  // Per-IP throttle on top of the per-account lockout.
  const wait = loginLimiter.check(req.ip)
  if (wait) {
    res.set('Retry-After', String(wait))
    return res.status(429).json({ error: `Too many sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` })
  }
  loginLimiter.hit(req.ip)

  const user = findUser(username)
  const result = user ? await checkPassword(user, password) : await failUnknownUser(username, password)
  if (result === 'locked') return locked(res)
  if (result !== 'ok') return res.status(401).json({ error: GENERIC })
  createSession(res, user.id)
  res.json({ user: { username: user.username, mustChangePassword: !!user.must_change_password } })
})

router.post('/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  const user = loadUser(req)
  if (!user) return res.status(401).json({ error: 'Not signed in.' })
  res.json({ user: { username: user.username, mustChangePassword: user.mustChangePassword } })
})

// --- Token submissions are throttled per IP (failures only) -------------------------
const tokenFailures = windowLimiter(10, 15 * 60_000)
const TOKEN_THROTTLED = 'Too many invalid links or attempts. Wait 15 minutes and try again.'
function tokenProblem(req, res, state, userId) {
  tokenFailures.hit(req.ip)
  if (userId) audit(userId, 'verification_failed', `A ${state} link was used`)
  const messages = {
    expired: 'This link has expired. Request a new one.',
    used: 'This link has already been used. Request a new one if you still need it.',
    invalid: 'This link isn’t valid. Check that you opened the whole link from the email, or request a new one.',
  }
  return res.status(400).json({ error: messages[state] || messages.invalid, code: `TOKEN_${(state || 'invalid').toUpperCase()}` })
}

const emailReady = () => mailEnabled() && !!config.appBaseUrl
const EMAIL_UNAVAILABLE =
  'Email isn’t set up on this server, so links can’t be sent. The site’s technical administrator can reset the password with “npm run admin:password” on the server.'

// --- Account recovery (forgotten password or locked account) -------------------------
const recoveryIpLimit = windowLimiter(5, 3600_000)
const RECOVERY_SENT = `If these details match an admin account, a recovery link has been sent to its registered email address. It works once and expires in ${TOKEN_MINUTES} minutes.`

router.post('/recovery', async (req, res) => {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : ''
  if (!identifier || identifier.length > 200) return res.status(400).json({ error: 'Enter the admin username or registered email.' })
  if (!emailReady()) return res.status(503).json({ error: EMAIL_UNAVAILABLE })
  if (recoveryIpLimit.blocked(req.ip)) return res.status(429).json({ error: 'Too many recovery requests. Try again in an hour.' })
  recoveryIpLimit.hit(req.ip)

  const user = db
    .prepare('SELECT id, username, email FROM users WHERE username = ? OR lower(email) = lower(?)')
    .get(identifier, identifier)
  // Unknown accounts get the same answer as known ones.
  if (!user || !user.email) return res.status(202).json({ message: RECOVERY_SENT })
  audit(user.id, 'recovery_requested', 'Recovery link requested')
  // At most 3 recovery emails per hour per account (prevents email flooding).
  if (recentTokenCount(user.id, PURPOSES.recovery) >= 3) {
    audit(user.id, 'recovery_throttled', 'Recovery email not sent: hourly limit reached')
    return res.status(202).json({ message: RECOVERY_SENT })
  }
  const { raw } = createToken(user.id, PURPOSES.recovery)
  const sent = await deliver(user.id, 'recovery_email', user.email, {
    subject: 'Katoto Project — Restore admin access',
    text: [
      'Someone asked to restore access to the Katoto Project website admin account.',
      '',
      `To choose a new password, open this link within ${TOKEN_MINUTES} minutes. It works only once:`,
      tokenLink('reset', raw),
      '',
      'Setting a new password also unlocks the account and signs out every existing session.',
      '',
      'If you didn’t ask for this, you can ignore this email: nothing changes unless the link is used. Never forward this link.',
    ].join('\n'),
  })
  if (!sent.sent) {
    invalidateTokens(user.id)
    // Don't claim a delivery that didn't happen.
    return res.status(502).json({ error: 'The recovery email couldn’t be sent right now. Try again later.' })
  }
  res.status(202).json({ message: RECOVERY_SENT })
})

// Lets the reset page say whether its link is still usable before the admin types a password.
router.post('/recovery/check', (req, res) => {
  if (tokenFailures.blocked(req.ip)) return res.status(429).json({ error: TOKEN_THROTTLED })
  const { state, row } = inspectToken(req.body?.token, [PURPOSES.recovery])
  if (state !== 'valid') return tokenProblem(req, res, state, row?.user_id)
  res.json({ ok: true, expiresAt: row.expires_at })
})

router.post('/recovery/complete', async (req, res) => {
  if (tokenFailures.blocked(req.ip)) return res.status(429).json({ error: TOKEN_THROTTLED })
  const { token, newPassword } = req.body || {}
  const { state, row } = inspectToken(token, [PURPOSES.recovery])
  if (state !== 'valid') return tokenProblem(req, res, state, row?.user_id)
  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(row.user_id)
  const problem = validateNewPassword(newPassword, user.username)
  if (problem) return res.status(400).json({ error: problem, errors: { newPassword: problem } })
  const hash = await hashPassword(newPassword)

  // Use the token and apply the change together; a token used in parallel fails here.
  const applied = transaction(() => {
    const used = consumeToken(token, [PURPOSES.recovery])
    if (!used || used.user_id !== user.id) return false
    db.prepare(
      `UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'),
         failed_login_attempts = 0, is_locked = 0, locked_at = NULL WHERE id = ?`,
    ).run(hash, user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
    invalidateTokens(user.id)
    return true
  })
  if (!applied) return tokenProblem(req, res, 'used', user.id)
  audit(user.id, 'password_reset', 'Password reset with an emailed recovery link; all sessions signed out')
  audit(user.id, 'account_unlocked', 'Unlocked by completing password recovery')
  await deliver(user.id, 'reset_confirmation', user.email, {
    subject: 'Katoto Project — Admin password changed',
    text: [
      'The Katoto Project admin password was just reset using a recovery link, and the account is unlocked. Every existing session was signed out.',
      '',
      'If you didn’t do this, someone else has access to this email account. Secure the email account first, then request a new recovery link.',
    ].join('\n'),
  })
  res.json({ ok: true })
})

// --- Changes made while signed in: verified by email -----------------------------------
// Re-entering the current password is the recent-authentication check, and
// wrong passwords here count toward the lockout like sign-in attempts.
async function reauthenticate(req, res) {
  const password = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
  if (!password) {
    res.status(400).json({ error: 'Enter your current password.', errors: { currentPassword: 'Required.' } })
    return false
  }
  const result = await checkPassword({ id: req.user.id }, password, { context: 'account change' })
  if (result === 'locked') {
    destroySession(req, res)
    locked(res)
    return false
  }
  if (result !== 'ok') {
    res.status(400).json({ error: 'Your current password is incorrect.', errors: { currentPassword: 'Incorrect password.' } })
    return false
  }
  return true
}

async function sendVerification(req, res, purpose, payload, { what, summary }) {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.user.id)
  if (recentTokenCount(user.id, purpose) >= 3)
    return res.status(429).json({ error: 'Too many verification emails this hour. Use the latest email, or try again later.' })
  const { raw, expiresAt } = createToken(user.id, purpose, payload)
  const sent = await deliver(user.id, `${purpose}_verification`, user.email, {
    subject: `Katoto Project — Confirm ${what}`,
    text: [
      `A request was made in the Katoto Project admin to ${summary}.`,
      '',
      `To confirm it, open this link within ${TOKEN_MINUTES} minutes. It works only once:`,
      tokenLink('verify', raw),
      '',
      'Nothing changes until the link is opened and confirmed. If you didn’t ask for this, ignore this email and change the admin password.',
    ].join('\n'),
  })
  if (!sent.sent) {
    invalidateTokens(user.id)
    return res.status(502).json({ error: `The verification email couldn’t be sent, so ${what} was not changed. Try again later.` })
  }
  audit(user.id, `${purpose}_requested`, `Verification email sent for ${what}`)
  res.status(202).json({ pending: true, purpose, expiresAt, sentTo: maskEmail(user.email) })
}

router.post('/password', requireAdmin({ allowPendingPasswordChange: true }), async (req, res) => {
  const { newPassword, currentPassword } = req.body || {}
  const problem = validateNewPassword(newPassword, req.user.username)
  if (problem) return res.status(400).json({ error: problem, errors: { newPassword: problem } })
  if (newPassword === currentPassword)
    return res.status(400).json({ error: 'Choose a different password.', errors: { newPassword: 'Must differ from the current password.' } })
  if (!(await reauthenticate(req, res))) return

  if (!emailReady()) {
    const hash = await hashPassword(newPassword)
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), failed_login_attempts = 0 WHERE id = ?").run(hash, req.user.id)
    destroySession(req, res)
    audit(req.user.id, 'password_changed', 'Password changed directly (email service not configured); all sessions signed out')
    return res.json({ changed: true, message: 'Password changed successfully. Please sign in with your new password.' })
  }

  // Only the hash of the proposed password is kept while waiting for verification.
  await sendVerification(req, res, PURPOSES.password, await hashPassword(newPassword), {
    what: 'the new admin password',
    summary: 'change the admin password',
  })
})

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/i
router.post('/username', requireAdmin(), async (req, res) => {
  if (!emailReady()) return res.status(503).json({ error: EMAIL_UNAVAILABLE })
  const newUsername = typeof req.body?.newUsername === 'string' ? req.body.newUsername.trim() : ''
  let problem = ''
  if (!USERNAME_RE.test(newUsername)) problem = 'Use 3–32 letters, numbers, dots, dashes, or underscores, starting with a letter or number.'
  else if (newUsername.toLowerCase() === req.user.username.toLowerCase()) problem = 'That is already your username.'
  else if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(newUsername)) problem = 'That username is taken.'
  if (problem) return res.status(400).json({ error: problem, errors: { newUsername: problem } })
  if (!(await reauthenticate(req, res))) return
  await sendVerification(req, res, PURPOSES.username, newUsername, {
    what: 'the new admin username',
    summary: `change the admin username to “${newUsername}”`,
  })
})

// The verification page shows what will change and asks for a click to confirm,
// so automatic link scanners in mail apps can't apply a change by opening the link.
const CHANGE_PURPOSES = [PURPOSES.password, PURPOSES.username]
router.post('/verify/check', (req, res) => {
  if (tokenFailures.blocked(req.ip)) return res.status(429).json({ error: TOKEN_THROTTLED })
  const { state, row } = inspectToken(req.body?.token, CHANGE_PURPOSES)
  if (state !== 'valid') return tokenProblem(req, res, state, row?.user_id)
  res.json({
    ok: true,
    purpose: row.purpose,
    newUsername: row.purpose === PURPOSES.username ? row.payload : undefined,
    expiresAt: row.expires_at,
  })
})

router.post('/verify', async (req, res) => {
  if (tokenFailures.blocked(req.ip)) return res.status(429).json({ error: TOKEN_THROTTLED })
  const token = req.body?.token
  const { state, row } = inspectToken(token, CHANGE_PURPOSES)
  if (state !== 'valid') return tokenProblem(req, res, state, row?.user_id)
  const account = db.prepare('SELECT id, email, is_locked FROM users WHERE id = ?').get(row.user_id)
  if (account.is_locked) return locked(res)

  let outcome
  try {
    outcome = transaction(() => {
      const used = consumeToken(token, CHANGE_PURPOSES)
      if (!used) return null
      if (used.purpose === PURPOSES.password) {
        db.prepare(
          "UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), failed_login_attempts = 0 WHERE id = ?",
        ).run(used.payload, used.user_id)
      } else {
        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(used.payload, used.user_id)
      }
      // Every session ends; the admin signs in again with the new details.
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(used.user_id)
      invalidateTokens(used.user_id)
      return used
    })
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'That username was taken in the meantime. Choose another one.' })
    throw err
  }
  if (!outcome) return tokenProblem(req, res, 'used', account.id)

  const isPassword = outcome.purpose === PURPOSES.password
  audit(account.id, isPassword ? 'password_changed' : 'username_changed', isPassword ? 'Password changed after email verification; all sessions signed out' : `Username changed to “${outcome.payload}” after email verification; all sessions signed out`)
  await deliver(account.id, `${outcome.purpose}_confirmation`, account.email, {
    subject: `Katoto Project — Admin ${isPassword ? 'password' : 'username'} changed`,
    text: [
      isPassword
        ? 'The Katoto Project admin password was changed after confirmation from this email address.'
        : `The Katoto Project admin username was changed to “${outcome.payload}” after confirmation from this email address.`,
      'Every existing session was signed out.',
      '',
      'If you didn’t do this, use the recovery page (/admin/recover) right away to choose a new password.',
    ].join('\n'),
  })
  res.json({ ok: true, purpose: outcome.purpose, newUsername: isPassword ? undefined : outcome.payload })
})

// Cancels a pending change before it is confirmed.
router.delete('/pending/:purpose', requireAdmin({ allowPendingPasswordChange: true }), (req, res) => {
  const purpose = { password: PURPOSES.password, username: PURPOSES.username }[req.params.purpose]
  if (!purpose) return res.status(404).json({ error: 'Not found.' })
  // Invalidate rather than delete, so cancelled links still count toward the hourly email limit.
  const n = db
    .prepare("UPDATE auth_tokens SET used_at = datetime('now') WHERE user_id = ? AND purpose = ? AND used_at IS NULL")
    .run(req.user.id, purpose).changes
  if (n) audit(req.user.id, `${purpose}_cancelled`, 'Pending change cancelled before verification')
  res.json({ ok: true })
})

// --- Account & security page -------------------------------------------------------
router.get('/security', requireAdmin({ allowPendingPasswordChange: true }), (req, res) => {
  const u = db
    .prepare(
      `SELECT username, email, failed_login_attempts AS failedAttempts, is_locked AS isLocked, locked_at AS lockedAt,
              last_failed_login_at AS lastFailedAt, password_changed_at AS passwordChangedAt, must_change_password AS mustChange
       FROM users WHERE id = ?`,
    )
    .get(req.user.id)
  const pending = db
    .prepare(
      `SELECT purpose, payload, expires_at AS expiresAt FROM auth_tokens
       WHERE user_id = ? AND used_at IS NULL AND expires_at > ? AND purpose IN (?, ?)`,
    )
    .all(req.user.id, Date.now(), PURPOSES.password, PURPOSES.username)
    .map((p) => ({ purpose: p.purpose, expiresAt: p.expiresAt, newUsername: p.purpose === PURPOSES.username ? p.payload : undefined }))
  const events = db
    .prepare(
      `SELECT id, event, detail, created_at AS at FROM security_events
       WHERE (user_id = ? OR user_id IS NULL) AND event != 'admin_change' ORDER BY id DESC LIMIT 100`,
    )
    .all(req.user.id)
  const activity = db
    .prepare(`SELECT id, detail, created_at AS at FROM security_events WHERE event = 'admin_change' ORDER BY id DESC LIMIT 50`)
    .all()
  res.json({
    account: {
      username: u.username,
      email: maskEmail(u.email),
      hasEmail: !!u.email,
      failedAttempts: u.failedAttempts,
      maxFailedAttempts: MAX_FAILED_LOGINS,
      lastFailedAt: u.lastFailedAt,
      lockedAt: u.lockedAt,
      passwordChangedAt: u.passwordChangedAt,
      mustChangePassword: !!u.mustChange,
    },
    email: { configured: mailEnabled(), linksConfigured: !!config.appBaseUrl, tokenMinutes: TOKEN_MINUTES },
    pending,
    events,
    activity,
    retentionDays: config.retention.securityEventsDays,
  })
})

export default router
