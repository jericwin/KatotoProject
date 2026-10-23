import crypto from 'node:crypto'
import { db } from './db.js'
import { config } from './config.js'
import { auditOnce } from './security.js'

export const COOKIE = config.isProduction ? '__Host-katoto_admin' : 'katoto_admin'

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: config.sessionHours * 3600 * 1000,
  }
}

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = Date.now() + config.sessionHours * 3600 * 1000
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires)
  res.cookie(COOKIE, token, cookieOptions())
}

export function destroySession(req, res) {
  const token = readCookie(req)
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined })
}

function readCookie(req) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === COOKIE) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}

// Attaches req.user when a valid session cookie is present.
export function loadUser(req) {
  const token = readCookie(req)
  if (!token) return null
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.must_change_password AS mustChangePassword, s.expires_at AS expiresAt
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND u.is_locked = 0`,
    )
    .get(sha256(token))
  if (!row) return null
  if (row.expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
    return null
  }
  return { id: row.id, username: row.username, mustChangePassword: !!row.mustChangePassword }
}

export function requireAdmin({ allowPendingPasswordChange = false } = {}) {
  return (req, res, next) => {
    const user = loadUser(req)
    if (!user) {
      // Logged at most once per 15 minutes so probing can't flood the log.
      auditOnce(null, 'unauthorized_request', `${req.method} ${req.baseUrl}${req.path} without a valid session`)
      return res.status(401).json({ error: 'Please sign in.' })
    }
    // In production the initial password must be replaced before anything else.
    if (config.isProduction && user.mustChangePassword && !allowPendingPasswordChange) {
      return res.status(403).json({ error: 'Change the initial password before continuing.', code: 'PASSWORD_CHANGE_REQUIRED' })
    }
    req.user = user
    next()
  }
}

// CSRF defence for state-changing admin requests, on top of SameSite=Strict:
// the Origin must match this host, and a custom header is required (which a
// cross-site form or image request cannot set).
export function verifyOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const forbid = (why) => {
    auditOnce(null, 'request_forbidden', `${req.method} ${req.baseUrl}${req.path} rejected (${why})`)
    return res.status(403).json({ error: 'Forbidden.' })
  }
  if (req.get('x-requested-with') !== 'katoto-admin') return forbid('missing request header')
  const origin = req.get('origin')
  if (origin) {
    let host
    try {
      host = new URL(origin).host
    } catch {
      return forbid('invalid origin')
    }
    const ownHost = req.get('x-forwarded-host') || req.get('host')
    if (host !== ownHost && !config.allowedOrigins.includes(origin)) return forbid('cross-site origin')
  }
  next()
}

// Sign-in throttling per IP (in memory, which suits a single server process).
// The per-account limit is the persistent lockout in server/security.js.
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 20
const ipHits = new Map()

function bump(map, key) {
  const now = Date.now()
  const entry = map.get(key)
  if (!entry || now - entry.start > WINDOW_MS) {
    map.set(key, { start: now, count: 1 })
    return 1
  }
  entry.count += 1
  return entry.count
}
function peek(map, key) {
  const entry = map.get(key)
  if (!entry || Date.now() - entry.start > WINDOW_MS) return 0
  return entry.count
}
function retryAfter(map, key) {
  const entry = map.get(key)
  return entry ? Math.max(1, Math.ceil((entry.start + WINDOW_MS - Date.now()) / 1000)) : 0
}

export const loginLimiter = {
  check(ip) {
    return peek(ipHits, ip) >= MAX_PER_IP ? retryAfter(ipHits, ip) : 0
  },
  hit(ip) {
    bump(ipHits, ip)
  },
}

setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  const now = Date.now()
  for (const [k, v] of ipHits) if (now - v.start > WINDOW_MS) ipHits.delete(k)
}, 10 * 60 * 1000).unref()
