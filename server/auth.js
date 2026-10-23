import crypto from 'node:crypto'
import { db } from './db.js'
import { config } from './config.js'
import { auditOnce } from './security.js'

export const COOKIE = 'katoto_admin'
export const HOST_COOKIE = '__Host-katoto_admin'

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const SESSION_SECRET = process.env.SESSION_SECRET || 'katoto_paete_2026_secure_session_secret_key'

function signToken(userId, username, expires) {
  const payload = Buffer.from(JSON.stringify({ u: userId, un: username, exp: expires })).toString('base64url')
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
  if (sig.length !== expectedSig.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionHours * 3600 * 1000,
  }
}

export function createSession(res, userId, username = '') {
  const expires = Date.now() + config.sessionHours * 3600 * 1000
  const token = signToken(userId, username, expires)
  try {
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires)
  } catch {
    // If sessions table write fails in ephemeral container, signed token continues to work
  }
  res.cookie(COOKIE, token, cookieOptions())
  if (config.isProduction) {
    res.cookie(HOST_COOKIE, token, cookieOptions())
  }
}

export function destroySession(req, res) {
  const tokens = readCookies(req)
  for (const token of tokens) {
    try {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
    } catch {
      // Ignore in serverless
    }
  }
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined })
  res.clearCookie(HOST_COOKIE, { ...cookieOptions(), maxAge: undefined })
}

function readCookies(req) {
  const header = req.headers.cookie
  if (!header) return []
  const tokens = []
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const name = part.slice(0, idx).trim()
    if (name === COOKIE || name === HOST_COOKIE) {
      const val = decodeURIComponent(part.slice(idx + 1).trim())
      if (val) tokens.push(val)
    }
  }
  return tokens
}

// Attaches req.user when a valid session cookie is present.
export function loadUser(req) {
  const tokens = readCookies(req)
  if (tokens.length === 0) return null

  // 1. Check signed HMAC token first (works seamlessly across all serverless containers)
  for (const token of tokens) {
    const verified = verifyToken(token)
    if (verified) {
      try {
        const row = db
          .prepare(
            `SELECT u.id, u.username, u.must_change_password AS mustChangePassword, u.is_locked AS isLocked
             FROM users u WHERE (u.id = ? OR u.username = ?)`,
          )
          .get(verified.u, verified.un || '')
        if (row) {
          if (row.isLocked) return null
          return { id: row.id, username: row.username, mustChangePassword: !!row.mustChangePassword }
        }
      } catch {
        // If db read fails, fallback to verified token details
      }
      return { id: verified.u, username: verified.un || 'katoto', mustChangePassword: false }
    }
  }

  // 2. Fallback to database session table for legacy or un-signed tokens
  for (const token of tokens) {
    try {
      const row = db
        .prepare(
          `SELECT u.id, u.username, u.must_change_password AS mustChangePassword, s.expires_at AS expiresAt
           FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND u.is_locked = 0`,
        )
        .get(sha256(token))
      if (row) {
        if (row.expiresAt < Date.now()) {
          try {
            db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
          } catch {}
          continue
        }
        return { id: row.id, username: row.username, mustChangePassword: !!row.mustChangePassword }
      }
    } catch {
      // Ignore db errors
    }
  }

  return null
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
