import path from 'node:path'
import { fileURLToPath } from 'node:url'

const isVercel = Boolean(process.env.VERCEL)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production') || isVercel
// Libraries (Express included) switch off development behaviour when NODE_ENV
// is "production"; set it here because `npm start` selects production by flag.
if (isProduction) process.env.NODE_ENV = 'production'
const defaultDataDir = isVercel ? '/tmp/server-data' : 'server-data'
const dataDir = isVercel
  ? (process.env.DATA_DIR && process.env.DATA_DIR.startsWith('/tmp') ? process.env.DATA_DIR : '/tmp/server-data')
  : (process.env.DATA_DIR ? path.resolve(root, process.env.DATA_DIR) : path.resolve(root, defaultDataDir))
// The database and uploads must never sit inside the publicly served build.
if (!isVercel && !path.relative(path.join(root, 'dist'), dataDir).startsWith('..')) {
  console.error('[config] REFUSING TO START: DATA_DIR is inside dist/, which is served publicly.')
  process.exit(1)
}

// Base URL used in emailed links (recovery, verification). Taken only from
// configuration, never from the request's Host header, so a forged Host can't
// produce a malicious link. Production requires https.
function parseBaseUrl(raw) {
  let val = raw ? String(raw).trim() : ''
  if (isVercel && (!val || val.includes('localhost') || val.startsWith('http://'))) {
    val = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://katoto-project.vercel.app'
  }
  const fallback = isProduction ? (isVercel ? 'https://katoto-project.vercel.app' : '') : 'http://localhost:5173'
  if (!val) return fallback
  try {
    const u = new URL(val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`)
    const local = ['localhost', '127.0.0.1'].includes(u.hostname)
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local && !isProduction)) {
      if (isVercel) return 'https://katoto-project.vercel.app'
      throw new Error('must use https')
    }
    if (u.username || u.password || u.search || u.hash) throw new Error('must be a plain origin')
    return u.origin + u.pathname.replace(/\/+$/, '')
  } catch (err) {
    console.error(`[config] APP_BASE_URL is invalid (${err.message}); emailed links are disabled.`)
    return isVercel ? 'https://katoto-project.vercel.app' : ''
  }
}

export const config = {
  root,
  isProduction,
  isVercel,
  port: Number(process.env.PORT) || 8787,
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY || (isVercel ? 1 : 'loopback'),
  dataDir,
  uploadsDir: path.join(dataDir, 'uploads'),
  // FOI documents are kept outside /uploads and served through the API, so
  // unpublished files are never reachable.
  documentsDir: path.join(dataDir, 'documents'),
  distDir: path.join(root, 'dist'),
  sessionHours: Number(process.env.SESSION_HOURS) || 8,
  // Calendar days for visit statistics are counted in this time zone.
  timeZone: process.env.STATS_TIME_ZONE || 'Asia/Manila',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  maxDocumentMb: Number(process.env.MAX_DOCUMENT_MB) || 25,
  // Retention, in days. Contact messages and closed privacy requests are
  // deleted automatically after these periods (see server/retention.js).
  retention: {
    messagesDays: Number(process.env.MESSAGE_RETENTION_DAYS) || 365,
    privacyRequestsDays: Number(process.env.PRIVACY_REQUEST_RETENTION_DAYS) || 365,
    visitStatsDays: 400,
    securityEventsDays: Number(process.env.SECURITY_LOG_RETENTION_DAYS) || 365,
  },
  appBaseUrl: parseBaseUrl(process.env.APP_BASE_URL),
  // The admin account's registered email: security alerts, recovery links
  // and change verifications go only here.
  adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
  // Optional: email a notification for each contact-form message. Without
  // SMTP settings, messages are still saved and shown in Admin → Messages.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
    // Defaults to the published contact email when empty.
    notify: process.env.NOTIFY_EMAIL || '',
  },
  // Comma-separated extra origins allowed to make admin requests
  // (the request's own host is always allowed).
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}
