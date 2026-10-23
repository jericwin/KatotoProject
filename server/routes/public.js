import { Router } from 'express'
import { db } from '../db.js'
import { getPublished, getDraft } from '../content.js'
import { loadUser } from '../auth.js'
import { publicUrl } from '../images.js'
import { config } from '../config.js'
import { EVENT_TYPES, recordEvent, shouldSkip } from '../stats.js'
import { documentPath, opensInline } from '../documents.js'
import { text, email, done } from '../validate.js'
import { notifyNewMessage, notifyPrivacyRequest, mailEnabled } from '../mailer.js'
import { CONTACT_TOPICS } from '../../src/data/siteDefaults.js'
import { CONTACT_CONSENT_VERSION, PRIVACY_REQUEST_TYPES } from '../../src/data/legal.js'

const router = Router()

export function albumsWithPhotos({ includeUnpublished = false } = {}) {
  const albums = db
    .prepare(
      `SELECT id, title, description, published, cover_photo_id AS coverPhotoId, position, updated_at AS updatedAt
       FROM albums ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY position, id`,
    )
    .all()
  const photosStmt = db.prepare(
    'SELECT id, file, thumb, width, height, caption, alt, position FROM photos WHERE album_id = ? ORDER BY position, id',
  )
  return albums.map((a) => {
    const photos = photosStmt.all(a.id).map((p) => ({
      id: p.id,
      src: publicUrl(p.file),
      thumb: publicUrl(p.thumb),
      width: p.width,
      height: p.height,
      caption: p.caption,
      alt: p.alt,
      position: p.position,
    }))
    const cover = photos.find((p) => p.id === a.coverPhotoId) || photos[0] || null
    return { ...a, published: !!a.published, cover, photos }
  })
}

export function newsItems({ includeUnpublished = false } = {}) {
  return db
    .prepare(
      `SELECT id, date_label AS dateLabel, title, body, tag, published, position
       FROM news ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY position, id`,
    )
    .all()
    .map((n) => ({ ...n, published: !!n.published }))
}

export function foiPosts({ includeUnpublished = false } = {}) {
  return db
    .prepare(
      `SELECT id, title, category, posted_on AS postedOn, body, file, file_name AS fileName, file_type AS fileType,
              file_size AS fileSize, published, updated_at AS updatedAt
       FROM foi_posts ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY posted_on DESC, id DESC`,
    )
    .all()
    .map(({ file, ...p }) => ({
      ...p,
      published: !!p.published,
      fileUrl: file ? `/api/public/foi/${p.id}/file` : null,
    }))
}

// Everything the public site needs in one request. ?preview=1 returns draft
// content and unpublished items, but only to a signed-in admin.
router.get('/site', (req, res) => {
  const wantsPreview = req.query.preview === '1'
  const preview = wantsPreview && !!loadUser(req)
  // no-cache = always revalidate (cheap via Express's ETag), so published
  // changes show up immediately.
  res.set('Cache-Control', preview || wantsPreview ? 'private, no-store' : 'no-cache')
  res.json({
    preview,
    content: preview ? getDraft() : getPublished(),
    news: newsItems({ includeUnpublished: preview }),
    albums: albumsWithPhotos({ includeUnpublished: preview }).filter((a) => a.photos.length > 0),
    foi: foiPosts({ includeUnpublished: preview }),
    // Facts the privacy pages state, taken from the running configuration.
    privacy: {
      messageRetentionDays: config.retention.messagesDays,
      privacyRequestRetentionDays: config.retention.privacyRequestsDays,
      visitStatsRetentionDays: config.retention.visitStatsDays,
      emailAlerts: mailEnabled(),
    },
  })
})

// FOI attachments: served only for published posts (or to a signed-in admin).
router.get('/foi/:id/file', (req, res) => {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : 0
  const post = db.prepare('SELECT published, file, file_name AS fileName, file_type AS fileType FROM foi_posts WHERE id = ?').get(id)
  if (!post?.file || (!post.published && !loadUser(req))) return res.status(404).json({ error: 'Not found.' })
  const disposition = opensInline(post.fileType) ? 'inline' : 'attachment'
  const ascii = post.fileName.replace(/[^ -~]/g, '_').replace(/["\\]/g, '')
  res.set({
    'Content-Type': post.fileType,
    'Content-Disposition': `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(post.fileName)}`,
    'Cache-Control': post.published ? 'no-cache' : 'private, no-store',
  })
  res.sendFile(documentPath(post.file), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Not found.' })
  })
})

// --- Forms: contact messages and privacy requests ------------------------------
// In-memory limits (single process): per IP per hour, and per day site-wide.
const HOUR = 3600 * 1000
function formLimiter({ perIpPerHour, perDay }) {
  const hits = new Map()
  let day = { start: Date.now(), n: 0 }
  setInterval(() => {
    const now = Date.now()
    for (const [ip, times] of hits) if (!times.some((t) => now - t < HOUR)) hits.delete(ip)
  }, HOUR).unref()
  return {
    blocked(ip) {
      const now = Date.now()
      if (now - day.start > 24 * HOUR) day = { start: now, n: 0 }
      const recent = (hits.get(ip) || []).filter((t) => now - t < HOUR)
      hits.set(ip, recent)
      return recent.length >= perIpPerHour || day.n >= perDay
    },
    count(ip) {
      hits.get(ip).push(Date.now())
      day.n += 1
    },
  }
}
const messageLimit = formLimiter({ perIpPerHour: 5, perDay: 200 })
const requestLimit = formLimiter({ perIpPerHour: 3, perDay: 50 })

const sameOrigin = (req) => {
  try {
    return new URL(req.get('origin')).host === (req.get('x-forwarded-host') || req.get('host'))
  } catch {
    return false
  }
}

// Shared checks for public forms. Returns false when the response is already sent.
function acceptForm(req, res, limiter) {
  res.set('Cache-Control', 'no-store')
  if (!sameOrigin(req)) {
    res.status(403).json({ error: 'Forbidden.' })
    return false
  }
  // Honeypot: a field hidden from people. Bots that fill it get a fake success.
  if (req.body?.company) {
    res.status(201).json({ ok: true })
    return false
  }
  if (limiter.blocked(req.ip)) {
    res.status(429).json({ error: 'Too many requests from this connection. Please try again in an hour, or email Katoto directly.' })
    return false
  }
  return true
}

const notifyTo = () => config.smtp.notify || getPublished().contact?.email

router.post('/messages', async (req, res) => {
  if (!acceptForm(req, res, messageLimit)) return
  const body = req.body
  const errors = {}
  const topic = text(body.topic, 'topic', { max: 60, required: true, errors })
  if (topic && !CONTACT_TOPICS.includes(topic)) errors.topic = 'Choose a topic from the list.'
  const message = text(body.message, 'message', { max: 5000, required: true, errors })
  if (message && message.length < 10) errors.message = 'Please write a message of at least 10 characters.'
  // Consent is checked here, not only in the browser.
  if (body.consent !== true) errors.consent = 'Please confirm that Katoto may use your details to reply.'
  const msg = done(errors, {
    name: text(body.name, 'name', { max: 100, required: true, errors }),
    email: email(body.email, 'email', { errors }),
    topic,
    message,
  })

  messageLimit.count(req.ip)
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO messages (name, email, topic, message, consent_version, consented_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
    )
    .run(msg.name, msg.email, msg.topic, msg.message, CONTACT_CONSENT_VERSION)
  res.status(201).json({ ok: true })

  // Email alert after responding; failures are logged without message content.
  notifyNewMessage(msg, notifyTo())
    .then((sent) => sent && db.prepare('UPDATE messages SET notified = 1 WHERE id = ?').run(lastInsertRowid))
    .catch((err) => console.error(`[mail] notification for message ${lastInsertRowid} failed: ${err.code || err.message}`))
})

// Privacy requests (deletion, access, correction, photo removal). Recorded for
// an admin to verify and handle; nothing is deleted automatically.
router.post('/privacy-requests', async (req, res) => {
  if (!acceptForm(req, res, requestLimit)) return
  const body = req.body
  const errors = {}
  const type = text(body.type, 'type', { max: 20, required: true, errors })
  if (type && !PRIVACY_REQUEST_TYPES.some((t) => t.id === type)) errors.type = 'Choose what you would like us to do.'
  const needsDetails = type === 'photo' || type === 'correction' || type === 'other'
  const request = done(errors, {
    type,
    name: text(body.name, 'name', { max: 100, required: true, errors }),
    email: email(body.email, 'email', { errors }),
    details: text(body.details, 'details', { max: 3000, required: needsDetails, errors }),
  })
  requestLimit.count(req.ip)
  const { lastInsertRowid } = db
    .prepare('INSERT INTO privacy_requests (type, name, email, details, log) VALUES (?, ?, ?, ?, ?)')
    .run(request.type, request.name, request.email, request.details, JSON.stringify([{ at: new Date().toISOString(), event: 'Request received' }]))
  res.status(201).json({ ok: true, reference: `PR-${String(lastInsertRowid).padStart(4, '0')}` })

  const label = PRIVACY_REQUEST_TYPES.find((t) => t.id === request.type).label
  notifyPrivacyRequest({ label, id: lastInsertRowid }, notifyTo()).catch((err) =>
    console.error(`[mail] notification for privacy request ${lastInsertRowid} failed: ${err.code || err.message}`),
  )
})

// Visit statistics beacon from the public site. Always answers 204 so the
// response reveals nothing; see server/stats.js for what is (not) stored.
router.post('/event', (req, res) => {
  res.status(204).set('Cache-Control', 'no-store')
  const { type, referrer } = req.body || {}
  if (sameOrigin(req) && EVENT_TYPES.includes(type) && !shouldSkip(req) && !loadUser(req)) {
    recordEvent(req, { type, referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : '' })
  }
  res.end()
})

export default router
