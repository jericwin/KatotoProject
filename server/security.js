import crypto from 'node:crypto'
import { db } from './db.js'
import { config } from './config.js'
import { verifyPassword, burnTime, needsRehash, hashPassword } from './passwords.js'
import { sendSecurityEmail, mailEnabled } from './mailer.js'

export const MAX_FAILED_LOGINS = 5
export const TOKEN_MINUTES = 30
export const LOCKED_MESSAGE =
  'Your account has been temporarily locked for security reasons. Please check your registered email for instructions to restore access.'

// --- Audit log -------------------------------------------------------------------
// Security events only: no passwords, tokens, or IP addresses.
export function audit(userId, event, detail = '') {
  db.prepare('INSERT INTO security_events (user_id, event, detail) VALUES (?, ?, ?)').run(userId ?? null, event, detail)
}

// Records an event at most once per `minutes`, so repeated attempts can't flood the log.
export function auditOnce(userId, event, detail, minutes = 15) {
  const recent = db
    .prepare(`SELECT 1 FROM security_events WHERE user_id IS ? AND event = ? AND created_at > datetime('now', ?)`)
    .get(userId ?? null, event, `-${minutes} minutes`)
  if (!recent) audit(userId, event, detail)
}

export const maskEmail = (email) =>
  email ? email.replace(/^(.)(.*)(@.*)$/, (_, a, mid, domain) => `${a}${'•'.repeat(Math.min(Math.max(mid.length, 3), 8))}${domain}`) : ''

// --- Lockout ---------------------------------------------------------------------
// Each password check first *reserves* an attempt with one atomic UPDATE, so
// parallel requests can't evaluate more than MAX_FAILED_LOGINS guesses: once
// the counter reaches the limit (or the account is locked), no further
// password is even checked until the account is recovered.
const reserveAttempt = db.prepare(
  `UPDATE users SET failed_login_attempts = failed_login_attempts + 1
   WHERE id = ? AND is_locked = 0 AND failed_login_attempts < ? RETURNING failed_login_attempts AS n`,
)
const clearFailures = db.prepare('UPDATE users SET failed_login_attempts = 0 WHERE id = ? AND is_locked = 0')
const lockAccount = db.prepare(
  `UPDATE users SET is_locked = 1, locked_at = datetime('now') WHERE id = ? AND is_locked = 0 RETURNING locked_at`,
)

/**
 * Checks a password for an existing account, enforcing the lockout.
 * Returns 'ok', 'wrong', or 'locked'.
 */
export async function checkPassword(user, password, { context = 'sign-in' } = {}) {
  const reserved = reserveAttempt.get(user.id, MAX_FAILED_LOGINS)
  if (!reserved) {
    auditOnce(user.id, 'login_blocked_locked', `Attempt rejected because the account is locked (${context})`)
    return 'locked'
  }
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id)
  if (await verifyPassword(password, row.password_hash)) {
    // Fails if the account was locked by a parallel attempt in the meantime.
    if (!clearFailures.run(user.id).changes) return 'locked'
    // Upgrade older hashes (scrypt) to the current Argon2id settings.
    if (needsRehash(row.password_hash)) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?').run(await hashPassword(password), user.id, row.password_hash)
      audit(user.id, 'password_rehashed', 'Stored password hash upgraded to Argon2id')
    }
    return 'ok'
  }
  db.prepare("UPDATE users SET last_failed_login_at = datetime('now') WHERE id = ?").run(user.id)
  audit(user.id, 'login_failed', `Wrong password (${context}), consecutive failure ${reserved.n} of ${MAX_FAILED_LOGINS}`)
  if (reserved.n >= MAX_FAILED_LOGINS) {
    const locked = lockAccount.get(user.id)
    if (locked) await onLocked(user.id, locked.locked_at)
    return 'locked'
  }
  return 'wrong'
}

async function onLocked(userId, lockedAt) {
  audit(userId, 'account_locked', `Locked after ${MAX_FAILED_LOGINS} consecutive failed attempts`)
  // A locked account ends every signed-in session.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId)
  const when = new Date(`${lockedAt.replace(' ', 'T')}Z`).toLocaleString('en-PH', { timeZone: config.timeZone, dateStyle: 'long', timeStyle: 'long' })
  const recover = config.appBaseUrl ? `${config.appBaseUrl}/admin/recover` : '(the website’s /admin/recover page)'
  const result = await deliver(userId, 'lock_notification', user?.email, {
    subject: 'Katoto Project — Admin Account Security Alert',
    text: [
      `The Katoto Project website's admin account was locked on ${when}, after ${MAX_FAILED_LOGINS} consecutive failed sign-in attempts.`,
      '',
      'While it is locked, nobody can sign in, even with the correct password.',
      '',
      'To restore access:',
      `1. Open ${recover}`,
      '2. Enter the admin username or this email address to receive a single-use recovery link (valid for 30 minutes).',
      '3. Choose a new password. The account unlocks only after the new password is set.',
      '',
      'If you did not try to sign in, someone else may be trying to guess the password. Restore access with a new, strong password that you do not use anywhere else, and review the security log under Admin → Account & security.',
      '',
      'This email does not contain a password or a reset link, and Katoto Project will never ask for your password by email.',
    ].join('\n'),
  })
  return result
}

// Unknown usernames behave like real ones: after the same number of failures
// they get the same "locked" answer, so the response never reveals whether an
// account exists. Kept in memory (no account to store it on).
const unknownFailures = new Map()
export async function failUnknownUser(username, password) {
  await burnTime(password)
  const key = username.toLowerCase()
  const now = Date.now()
  const entry = unknownFailures.get(key)
  const fresh = !entry || now - entry.start > 3600_000 ? { start: now, n: 0 } : entry
  fresh.n += 1
  unknownFailures.set(key, fresh)
  return fresh.n >= MAX_FAILED_LOGINS ? 'locked' : 'wrong'
}
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of unknownFailures) if (now - v.start > 3600_000) unknownFailures.delete(k)
}, 600_000).unref()

// --- Single-use email tokens ------------------------------------------------------
// Purposes can't be swapped: the purpose is part of the hashed value and must
// also match the stored row, and each endpoint accepts only its own purposes.
export const PURPOSES = { recovery: 'recovery', password: 'password_change', username: 'username_change' }
const hashToken = (purpose, raw) => crypto.createHash('sha256').update(`${purpose}:${raw}`).digest('hex')
const isTokenShaped = (raw) => typeof raw === 'string' && /^[A-Za-z0-9_-]{43}$/.test(raw)

export function createToken(userId, purpose, payload = null) {
  const raw = crypto.randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + TOKEN_MINUTES * 60_000
  // Only one usable token per account and purpose. Older ones are invalidated,
  // not deleted, so they still count toward the hourly email limit.
  db.prepare("UPDATE auth_tokens SET used_at = datetime('now') WHERE user_id = ? AND purpose = ? AND used_at IS NULL").run(userId, purpose)
  db.prepare('INSERT INTO auth_tokens (user_id, purpose, token_hash, payload, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    purpose,
    hashToken(purpose, raw),
    payload,
    expiresAt,
  )
  return { raw, expiresAt }
}

// Looks a token up without using it: { state: 'valid' | 'expired' | 'used' | 'invalid', row }
export function inspectToken(raw, purposes) {
  if (!isTokenShaped(raw)) return { state: 'invalid' }
  for (const purpose of purposes) {
    const row = db.prepare('SELECT * FROM auth_tokens WHERE token_hash = ? AND purpose = ?').get(hashToken(purpose, raw), purpose)
    if (!row) continue
    if (row.used_at) return { state: 'used', row }
    if (row.expires_at <= Date.now()) return { state: 'expired', row }
    return { state: 'valid', row }
  }
  return { state: 'invalid' }
}

// Atomically marks a valid token used. Returns the row, or null if it was
// expired, used (including by a parallel request), or never existed.
export function consumeToken(raw, purposes) {
  if (!isTokenShaped(raw)) return null
  for (const purpose of purposes) {
    const row = db
      .prepare(
        `UPDATE auth_tokens SET used_at = datetime('now')
         WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ? RETURNING *`,
      )
      .get(hashToken(purpose, raw), purpose, Date.now())
    if (row) return row
  }
  return null
}

export function invalidateTokens(userId) {
  db.prepare("UPDATE auth_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").run(userId)
}

// How many emails of a purpose were sent to this account in the last hour.
export const recentTokenCount = (userId, purpose) =>
  db
    .prepare(`SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id = ? AND purpose = ? AND created_at > datetime('now', '-1 hour')`)
    .get(userId, purpose).n

export const tokenLink = (page, raw) => `${config.appBaseUrl}/admin/${page}#token=${raw}`

// --- Email delivery with honest results -----------------------------------------
// Returns { sent: true } only when the mail server accepted the message; every
// outcome is written to the audit log (without the message body or any token).
export async function deliver(userId, kind, to, message) {
  if (!mailEnabled()) {
    audit(userId, `${kind}_not_sent`, 'Email is not configured on the server (SMTP settings)')
    return { sent: false, reason: 'not_configured' }
  }
  if (!to) {
    audit(userId, `${kind}_not_sent`, 'The account has no registered email address')
    return { sent: false, reason: 'no_email' }
  }
  try {
    await sendSecurityEmail({ to, ...message })
    audit(userId, `${kind}_sent`, `Sent to ${maskEmail(to)}`)
    return { sent: true }
  } catch (err) {
    console.error(`[mail] ${kind} for user ${userId} failed: ${err.code || err.message}`)
    audit(userId, `${kind}_failed`, `Delivery failed (${err.code || 'error'})`)
    return { sent: false, reason: 'failed' }
  }
}

// --- Small in-memory limiter for token submissions and recovery requests -----------
export function windowLimiter(max, windowMs) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k)
  }, windowMs).unref()
  return {
    blocked: (key) => {
      const e = hits.get(key)
      return !!e && Date.now() - e.start <= windowMs && e.n >= max
    },
    hit: (key) => {
      const now = Date.now()
      const e = hits.get(key)
      if (!e || now - e.start > windowMs) hits.set(key, { start: now, n: 1 })
      else e.n += 1
    },
  }
}
