import crypto from 'node:crypto'
import { db } from './db.js'
import { config } from './config.js'

// Privacy-friendly visit counting:
// - no cookies, nothing stored in the browser, no IP addresses saved;
// - a visitor is `sha256(dailySalt + ip + user agent)`, and the salt is
//   replaced every day, so the same person can't be followed across days;
// - Do Not Track / Global Privacy Control, bots, and signed-in admins are
//   not counted.

export const EVENT_TYPES = ['view', 'apply', 'facebook', 'email', 'phone', 'foi']
const MAX_EVENTS_PER_VISITOR_PER_DAY = 100
// Per-IP cap kept only in memory (IPs are never written to the database), so
// rotating the user agent can't inflate the numbers.
const MAX_EVENTS_PER_IP_PER_DAY = 400
const ipCounts = new Map()
const RETENTION_DAYS = config.retention.visitStatsDays
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|java\/|go-http|node-fetch|axios|okhttp|monitor/i

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
export const dayOf = (date = new Date()) => dayFormat.format(date) // YYYY-MM-DD

function shiftDay(day, delta) {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

let saltCache = { day: null, salt: null }
function saltFor(day) {
  if (saltCache.day === day) return saltCache.salt
  let row = db.prepare('SELECT salt FROM visit_salts WHERE day = ?').get(day)
  if (!row) {
    row = { salt: crypto.randomBytes(32).toString('hex') }
    db.prepare('INSERT OR IGNORE INTO visit_salts (day, salt) VALUES (?, ?)').run(day, row.salt)
    row = db.prepare('SELECT salt FROM visit_salts WHERE day = ?').get(day)
    // Old salts are destroyed, which makes old visitor hashes unlinkable.
    db.prepare('DELETE FROM visit_salts WHERE day < ?').run(day)
    db.prepare('DELETE FROM visit_events WHERE day < ?').run(shiftDay(day, -RETENTION_DAYS))
  }
  saltCache = { day, salt: row.salt }
  return row.salt
}

function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

// Keep only the referring site's host name, grouping common variants.
function referrerHost(raw, ownHost) {
  if (typeof raw !== 'string' || !raw) return ''
  try {
    const u = new URL(raw)
    if (!/^https?:$/.test(u.protocol)) return ''
    let host = u.hostname.toLowerCase().replace(/^(www|m|l|lm|mobile)\./, '')
    if (ownHost && host === ownHost.toLowerCase().split(':')[0].replace(/^www\./, '')) return ''
    if (/(^|\.)facebook\.com$|^fb\.me$/.test(host)) host = 'facebook.com'
    if (/(^|\.)google\.[a-z.]+$/.test(host)) host = 'google'
    return host.slice(0, 100)
  } catch {
    return ''
  }
}

export function shouldSkip(req) {
  const ua = req.get('user-agent') || ''
  return !ua || BOT.test(ua) || req.get('dnt') === '1' || req.get('sec-gpc') === '1'
}

export function recordEvent(req, { type, referrer }) {
  const day = dayOf()
  if (ipCounts.day !== day) {
    ipCounts.clear()
    ipCounts.day = day
  }
  const ipCount = (ipCounts.get(req.ip) || 0) + 1
  ipCounts.set(req.ip, ipCount)
  if (ipCount > MAX_EVENTS_PER_IP_PER_DAY) return false
  const ua = req.get('user-agent') || ''
  const visitor = crypto
    .createHash('sha256')
    .update(`${saltFor(day)}|${req.ip}|${ua}`)
    .digest('hex')
    .slice(0, 32)
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM visit_events WHERE day = ? AND visitor = ?').get(day, visitor)
  if (n >= MAX_EVENTS_PER_VISITOR_PER_DAY) return false
  const host = req.get('x-forwarded-host') || req.get('host') || ''
  db.prepare('INSERT INTO visit_events (day, type, visitor, referrer, device) VALUES (?, ?, ?, ?, ?)').run(
    day,
    type,
    visitor,
    type === 'view' ? referrerHost(referrer, host) : '',
    deviceOf(ua),
  )
  return true
}

// Aggregates for the admin overview. Every number is counted from stored rows.
export function visitStats(rangeDays) {
  const today = dayOf()
  const from = shiftDay(today, -(rangeDays - 1))
  const prevFrom = shiftDay(from, -rangeDays)
  const prevTo = shiftDay(from, -1)

  const perDay = new Map(
    db
      .prepare(
        `SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
         FROM visit_events WHERE type = 'view' AND day BETWEEN ? AND ? GROUP BY day`,
      )
      .all(from, today)
      .map((r) => [r.day, r]),
  )
  const daily = []
  for (let d = from; d <= today; d = shiftDay(d, 1)) {
    const r = perDay.get(d)
    daily.push({ day: d, views: r?.views ?? 0, visitors: r?.visitors ?? 0 })
  }
  const sum = (key) => daily.reduce((a, r) => a + r[key], 0)

  const prev = db
    .prepare(
      `SELECT COUNT(*) AS views, COUNT(DISTINCT day || visitor) AS visitors
       FROM visit_events WHERE type = 'view' AND day BETWEEN ? AND ?`,
    )
    .get(prevFrom, prevTo)

  const actions = Object.fromEntries(EVENT_TYPES.filter((t) => t !== 'view').map((t) => [t, 0]))
  for (const r of db
    .prepare(`SELECT type, COUNT(*) AS n FROM visit_events WHERE type != 'view' AND day BETWEEN ? AND ? GROUP BY type`)
    .all(from, today))
    actions[r.type] = r.n

  const referrers = db
    .prepare(
      `SELECT referrer AS source, COUNT(*) AS views
       FROM visit_events WHERE type = 'view' AND day BETWEEN ? AND ?
       GROUP BY source ORDER BY views DESC, source LIMIT 8`,
    )
    .all(from, today)

  const devices = db
    .prepare(
      `SELECT device, COUNT(DISTINCT day || visitor) AS visitors
       FROM visit_events WHERE type = 'view' AND day BETWEEN ? AND ?
       GROUP BY device ORDER BY visitors DESC`,
    )
    .all(from, today)

  const allTime = db
    .prepare(`SELECT COUNT(*) AS views, MIN(created_at) AS since FROM visit_events WHERE type = 'view'`)
    .get()
  const todayRow = perDay.get(today)

  return {
    range: rangeDays,
    from,
    to: today,
    timeZone: config.timeZone,
    views: sum('views'),
    visitors: sum('visitors'),
    previous: { views: prev.views, visitors: prev.visitors },
    today: { views: todayRow?.views ?? 0, visitors: todayRow?.visitors ?? 0 },
    daily,
    actions,
    referrers,
    devices,
    allTime: { views: allTime.views, since: allTime.since },
  }
}
