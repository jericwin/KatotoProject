import { Router } from 'express'
import multer from 'multer'
import { db, transaction } from '../db.js'
import { config } from '../config.js'
import { requireAdmin, verifyOrigin } from '../auth.js'
import { getContentRow, saveDraftSection, publishDraft, discardDraft, SECTION_NAMES } from '../content.js'
import { storeImage, removeImageFiles } from '../images.js'
import { albumsWithPhotos, newsItems, foiPosts } from './public.js'
import { storeDocument, removeDocument, ACCEPTED_DOCUMENTS } from '../documents.js'
import { text, done, ids } from '../validate.js'
import { visitStats, dayOf, shiftDay } from '../stats.js'
import { mailEnabled } from '../mailer.js'
import { audit } from '../security.js'
import { NEWS_TAGS, FOI_CATEGORIES } from '../../src/data/siteDefaults.js'
import { PRIVACY_REQUEST_TYPES } from '../../src/data/legal.js'

const router = Router()
router.use(verifyOrigin, requireAdmin())
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  // Every successful change is recorded (method and route only; no request body).
  if (req.method !== 'GET')
    res.on('finish', () => {
      if (res.statusCode < 400) audit(req.user.id, 'admin_change', `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`)
    })
  next()
})

const notFound = (what) => Object.assign(new Error(`${what} not found.`), { status: 404 })
const intParam = (v) => (/^\d+$/.test(v) ? Number(v) : null)

// --- Overview ---------------------------------------------------------------
router.get('/overview', (req, res) => {
  const count = (sql, ...args) => db.prepare(sql).get(...args).n
  const content = getContentRow()
  const user = db.prepare('SELECT must_change_password AS m, password_changed_at AS changedAt FROM users WHERE id = ?').get(req.user.id)

  // Latest changes, from timestamps already stored on each record.
  const recent = [
    ...db
      .prepare(
        `SELECT a.id AS albumId, a.title, COUNT(*) AS n, MAX(p.created_at) AS at
         FROM photos p JOIN albums a ON a.id = p.album_id
         GROUP BY a.id, date(p.created_at) ORDER BY at DESC LIMIT 6`,
      )
      .all()
      .map((r) => ({ kind: 'photos', text: `${r.n} photo${r.n === 1 ? '' : 's'} added to “${r.title}”`, at: r.at, to: `albums/${r.albumId}` })),
    ...db
      .prepare('SELECT id, title, published, updated_at AS at FROM albums ORDER BY updated_at DESC LIMIT 6')
      .all()
      .map((r) => ({ kind: 'album', text: `Album “${r.title}” updated${r.published ? '' : ' (not published)'}`, at: r.at, to: `albums/${r.id}` })),
    ...db
      .prepare('SELECT title, published, updated_at AS at FROM news ORDER BY updated_at DESC LIMIT 6')
      .all()
      .map((r) => ({ kind: 'news', text: `News “${r.title}” saved${r.published ? '' : ' (hidden)'}`, at: r.at, to: 'news' })),
    ...db
      .prepare('SELECT title, published, updated_at AS at FROM foi_posts ORDER BY updated_at DESC LIMIT 6')
      .all()
      .map((r) => ({ kind: 'foi', text: `FOI post “${r.title}” saved${r.published ? '' : ' (hidden)'}`, at: r.at, to: 'foi' })),
    ...(content.publishedAt ? [{ kind: 'publish', text: 'Site text published', at: content.publishedAt, to: 'content' }] : []),
    ...(content.hasUnpublishedChanges ? [{ kind: 'draft', text: 'Site text draft saved', at: content.updatedAt, to: 'content' }] : []),
    ...(user.changedAt ? [{ kind: 'account', text: 'Admin password changed', at: user.changedAt, to: 'account' }] : []),
  ]
    // An upload also bumps its album's timestamp; show it once.
    .filter((r, i, all) => r.kind !== 'album' || !all.some((o) => o.kind === 'photos' && o.to === r.to && o.at === r.at))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 8)

  // Contact messages per week (weeks start on Monday, in the statistics time
  // zone), counted from the stored rows for the last 12 weeks.
  const WEEKS = 12
  const today = dayOf()
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const firstWeek = shiftDay(today, -weekday - (WEEKS - 1) * 7)
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({ week: shiftDay(firstWeek, i * 7), messages: 0 }))
  for (const { at } of db.prepare("SELECT created_at AS at FROM messages WHERE created_at >= datetime('now', '-90 days')").all()) {
    const day = dayOf(new Date(`${at.replace(' ', 'T')}Z`))
    const i = Math.floor((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${firstWeek}T12:00:00Z`)) / (7 * 86400000))
    if (i >= 0 && i < WEEKS) weekly[i].messages++
  }

  res.json({
    // Vercel keeps the database in temporary storage that is reset when the
    // server restarts and isn't shared between instances.
    persistentStorage: !config.isVercel,
    dataSince: db.prepare('SELECT MIN(created_at) AS at FROM users').get().at,
    messagesWeekly: weekly,
    messageTopics: db.prepare('SELECT topic, COUNT(*) AS n FROM messages GROUP BY topic ORDER BY n DESC, topic').all(),
    privacyRequests: count('SELECT COUNT(*) AS n FROM privacy_requests'),
    albums: count('SELECT COUNT(*) AS n FROM albums'),
    publishedAlbums: count('SELECT COUNT(*) AS n FROM albums WHERE published = 1'),
    emptyAlbums: count('SELECT COUNT(*) AS n FROM albums a WHERE NOT EXISTS (SELECT 1 FROM photos p WHERE p.album_id = a.id)'),
    unpublishedAlbumsWithPhotos: count(
      'SELECT COUNT(*) AS n FROM albums a WHERE published = 0 AND EXISTS (SELECT 1 FROM photos p WHERE p.album_id = a.id)',
    ),
    photos: count('SELECT COUNT(*) AS n FROM photos'),
    publicPhotos: count('SELECT COUNT(*) AS n FROM photos p JOIN albums a ON a.id = p.album_id WHERE a.published = 1'),
    publicPhotosMissingAlt: count(
      "SELECT COUNT(*) AS n FROM photos p JOIN albums a ON a.id = p.album_id WHERE a.published = 1 AND trim(p.alt) = ''",
    ),
    news: count('SELECT COUNT(*) AS n FROM news'),
    publishedNews: count('SELECT COUNT(*) AS n FROM news WHERE published = 1'),
    foi: count('SELECT COUNT(*) AS n FROM foi_posts'),
    messages: count('SELECT COUNT(*) AS n FROM messages'),
    unreadMessages: count('SELECT COUNT(*) AS n FROM messages WHERE read_at IS NULL'),
    openPrivacyRequests: count("SELECT COUNT(*) AS n FROM privacy_requests WHERE status IN ('new', 'verifying')"),
    publishedFoi: count('SELECT COUNT(*) AS n FROM foi_posts WHERE published = 1'),
    hasUnpublishedChanges: content.hasUnpublishedChanges,
    contentUpdatedAt: content.updatedAt,
    contentPublishedAt: content.publishedAt,
    volunteerApplyUrl: content.published.volunteer?.applyUrl || '',
    mustChangePassword: !!user.m,
    recent,
  })
})

router.get('/stats', (req, res) => {
  const range = [7, 30, 90].includes(Number(req.query.range)) ? Number(req.query.range) : 30
  res.json(visitStats(range))
})

// --- Site content (draft → publish) -----------------------------------------
router.get('/content', (req, res) => res.json(getContentRow()))
router.put('/content/:section', (req, res) => {
  if (!SECTION_NAMES.includes(req.params.section)) throw notFound('Section')
  res.json(saveDraftSection(req.params.section, req.body?.data))
})
router.post('/content/publish', (req, res) => res.json(publishDraft()))
router.post('/content/discard', (req, res) => res.json(discardDraft()))

// --- News & updates ----------------------------------------------------------
function readNews(body) {
  const errors = {}
  const tag = text(body.tag, 'tag', { max: 40, required: true, errors })
  if (tag && !NEWS_TAGS.includes(tag)) errors.tag = 'Choose a tag from the list.'
  return done(errors, {
    dateLabel: text(body.dateLabel, 'dateLabel', { max: 60, required: true, errors }),
    title: text(body.title, 'title', { max: 160, required: true, errors }),
    body: text(body.body, 'body', { max: 2000, errors }),
    tag,
    published: body.published === undefined ? true : !!body.published,
  })
}

router.get('/news', (req, res) => res.json({ news: newsItems({ includeUnpublished: true }), tags: NEWS_TAGS }))
router.post('/news', (req, res) => {
  const n = readNews(req.body || {})
  // New items go to the top of the list (newest first).
  transaction(() => {
    db.prepare('UPDATE news SET position = position + 1').run()
    db.prepare('INSERT INTO news (date_label, title, body, tag, published, position) VALUES (?, ?, ?, ?, ?, 0)').run(
      n.dateLabel,
      n.title,
      n.body,
      n.tag,
      n.published ? 1 : 0,
    )
  })
  res.status(201).json({ news: newsItems({ includeUnpublished: true }) })
})
router.put('/news/:id', (req, res) => {
  const id = intParam(req.params.id)
  const n = readNews(req.body || {})
  const r = db
    .prepare("UPDATE news SET date_label = ?, title = ?, body = ?, tag = ?, published = ?, updated_at = datetime('now') WHERE id = ?")
    .run(n.dateLabel, n.title, n.body, n.tag, n.published ? 1 : 0, id)
  if (!r.changes) throw notFound('News item')
  res.json({ news: newsItems({ includeUnpublished: true }) })
})
router.delete('/news/:id', (req, res) => {
  const r = db.prepare('DELETE FROM news WHERE id = ?').run(intParam(req.params.id))
  if (!r.changes) throw notFound('News item')
  res.json({ news: newsItems({ includeUnpublished: true }) })
})
router.post('/news/reorder', (req, res) => {
  const order = ids(req.body?.ids)
  if (!order) return res.status(400).json({ error: 'Invalid order.' })
  transaction(() => order.forEach((id, i) => db.prepare('UPDATE news SET position = ? WHERE id = ?').run(i, id)))
  res.json({ news: newsItems({ includeUnpublished: true }) })
})

// --- Albums ------------------------------------------------------------------
const getAlbum = (id) => albumsWithPhotos({ includeUnpublished: true }).find((a) => a.id === id)

function readAlbum(body, { partial = false } = {}) {
  const errors = {}
  const out = {}
  if (!partial || body.title !== undefined) out.title = text(body.title, 'title', { max: 120, required: true, errors })
  if (!partial || body.description !== undefined) out.description = text(body.description, 'description', { max: 600, errors })
  if (body.published !== undefined) out.published = !!body.published
  if (body.coverPhotoId !== undefined) {
    if (!Number.isInteger(body.coverPhotoId)) errors.coverPhotoId = 'Invalid photo.'
    else out.coverPhotoId = body.coverPhotoId
  }
  return done(errors, out)
}

router.get('/albums', (req, res) => res.json({ albums: albumsWithPhotos({ includeUnpublished: true }) }))
router.post('/albums', (req, res) => {
  const a = readAlbum(req.body || {})
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM albums').get().p
  const { lastInsertRowid } = db
    .prepare('INSERT INTO albums (title, description, published, position) VALUES (?, ?, 0, ?)')
    .run(a.title, a.description, pos)
  res.status(201).json({ album: getAlbum(Number(lastInsertRowid)) })
})
router.get('/albums/:id', (req, res) => {
  const album = getAlbum(intParam(req.params.id))
  if (!album) throw notFound('Album')
  res.json({ album })
})
router.put('/albums/:id', (req, res) => {
  const id = intParam(req.params.id)
  const album = getAlbum(id)
  if (!album) throw notFound('Album')
  const a = readAlbum(req.body || {}, { partial: true })
  if (a.coverPhotoId !== undefined && !album.photos.some((p) => p.id === a.coverPhotoId))
    return res.status(400).json({ error: 'The cover must be a photo in this album.' })
  if (a.published && album.photos.length === 0)
    return res.status(400).json({ error: 'Add at least one photo before publishing this album.' })
  db.prepare(
    `UPDATE albums SET title = COALESCE(?, title), description = COALESCE(?, description),
       published = COALESCE(?, published), cover_photo_id = COALESCE(?, cover_photo_id), updated_at = datetime('now')
     WHERE id = ?`,
  ).run(a.title ?? null, a.description ?? null, a.published === undefined ? null : a.published ? 1 : 0, a.coverPhotoId ?? null, id)
  res.json({ album: getAlbum(id) })
})
router.delete('/albums/:id', async (req, res) => {
  const id = intParam(req.params.id)
  const album = getAlbum(id)
  if (!album) throw notFound('Album')
  const files = db.prepare('SELECT file, thumb FROM photos WHERE album_id = ?').all(id)
  db.prepare('DELETE FROM albums WHERE id = ?').run(id)
  for (const f of files) await removeImageFiles(f)
  res.json({ ok: true })
})
router.post('/albums/reorder', (req, res) => {
  const order = ids(req.body?.ids)
  if (!order) return res.status(400).json({ error: 'Invalid order.' })
  transaction(() => order.forEach((id, i) => db.prepare('UPDATE albums SET position = ? WHERE id = ?').run(i, id)))
  res.json({ albums: albumsWithPhotos({ includeUnpublished: true }) })
})

// --- Photos ------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 20, fields: 60, fieldSize: 4000 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true)
    else cb(Object.assign(new Error(`“${file.originalname}” is not a JPEG, PNG, or WebP image.`), { status: 400 }))
  },
})

router.post('/albums/:id/photos', upload.array('photos', 20), async (req, res) => {
  const id = intParam(req.params.id)
  if (!getAlbum(id)) throw notFound('Album')
  const files = req.files || []
  if (!files.length) return res.status(400).json({ error: 'Choose at least one image.' })
  if (req.body.permission !== 'confirmed')
    return res.status(400).json({
      error: 'Confirm that Katoto has permission to publish these photos.',
      errors: { permission: 'Confirm that Katoto has permission to publish these photos.' },
    })
  const captions = [].concat(req.body.captions ?? [])
  const alts = [].concat(req.body.alts ?? [])

  // Process every file first so a bad file doesn't leave a half-saved batch.
  const stored = []
  try {
    for (const f of files) stored.push(await storeImage(f.buffer))
  } catch (err) {
    for (const s of stored) await removeImageFiles(s)
    if (err.status === 400) audit(req.user.id, 'upload_rejected', `Photo upload rejected: ${err.message}`)
    throw err
  }
  let pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM photos WHERE album_id = ?').get(id).p
  transaction(() => {
    stored.forEach((s, i) => {
      db.prepare(
        `INSERT INTO photos (album_id, file, thumb, width, height, caption, alt, position, permission_confirmed_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      ).run(
        id,
        s.file,
        s.thumb,
        s.width,
        s.height,
        String(captions[i] ?? '').trim().slice(0, 300),
        String(alts[i] ?? '').trim().slice(0, 400),
        pos++,
        req.user.id,
      )
    })
    db.prepare("UPDATE albums SET updated_at = datetime('now') WHERE id = ?").run(id)
  })
  res.status(201).json({ album: getAlbum(id) })
})

router.post('/albums/:id/photos/reorder', (req, res) => {
  const id = intParam(req.params.id)
  const order = ids(req.body?.ids)
  if (!order) return res.status(400).json({ error: 'Invalid order.' })
  transaction(() =>
    order.forEach((pid, i) => db.prepare('UPDATE photos SET position = ? WHERE id = ? AND album_id = ?').run(i, pid, id)),
  )
  res.json({ album: getAlbum(id) })
})

router.put('/photos/:id', (req, res) => {
  const id = intParam(req.params.id)
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id)
  if (!photo) throw notFound('Photo')
  const errors = {}
  const caption = text(req.body?.caption, 'caption', { max: 300, errors })
  const alt = text(req.body?.alt, 'alt', { max: 400, errors })
  let albumId = photo.album_id
  if (req.body?.albumId !== undefined) {
    if (!Number.isInteger(req.body.albumId) || !getAlbum(req.body.albumId)) errors.albumId = 'Choose an existing album.'
    else albumId = req.body.albumId
  }
  done(errors)
  transaction(() => {
    if (albumId !== photo.album_id) {
      const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM photos WHERE album_id = ?').get(albumId).p
      db.prepare('UPDATE photos SET album_id = ?, position = ? WHERE id = ?').run(albumId, pos, id)
      db.prepare('UPDATE albums SET cover_photo_id = NULL WHERE id = ? AND cover_photo_id = ?').run(photo.album_id, id)
    }
    db.prepare('UPDATE photos SET caption = ?, alt = ? WHERE id = ?').run(caption, alt, id)
  })
  res.json({ album: getAlbum(albumId) })
})

router.delete('/photos/:id', async (req, res) => {
  const id = intParam(req.params.id)
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id)
  if (!photo) throw notFound('Photo')
  transaction(() => {
    db.prepare('DELETE FROM photos WHERE id = ?').run(id)
    db.prepare('UPDATE albums SET cover_photo_id = NULL WHERE cover_photo_id = ?').run(id)
    // An album left empty can't stay public.
    db.prepare('UPDATE albums SET published = 0 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM photos WHERE album_id = ?)').run(
      photo.album_id,
      photo.album_id,
    )
  })
  await removeImageFiles(photo)
  res.json({ album: getAlbum(photo.album_id) })
})


// --- Freedom of Information ----------------------------------------------------
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxDocumentMb * 1024 * 1024, files: 1, fields: 10, fieldSize: 8000 },
}).single('file')

// Wraps multer so size errors name the document limit.
const withDocument = (req, res, next) =>
  documentUpload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: `The file must be under ${config.maxDocumentMb} MB.` })
    next(err)
  })

function readFoi(body, { hasFile }) {
  const errors = {}
  const category = text(body.category, 'category', { max: 40, required: true, errors })
  if (category && !FOI_CATEGORIES.includes(category)) errors.category = 'Choose a category from the list.'
  const postedOn = text(body.postedOn, 'postedOn', { max: 10, required: true, errors })
  if (postedOn && (!/^\d{4}-\d{2}-\d{2}$/.test(postedOn) || Number.isNaN(Date.parse(`${postedOn}T00:00:00Z`))))
    errors.postedOn = 'Enter a valid date.'
  const bodyText = text(body.body, 'body', { max: 4000, errors })
  if (!bodyText && !hasFile) errors.body = 'Write the announcement, attach a file, or both.'
  return done(errors, {
    title: text(body.title, 'title', { max: 160, required: true, errors }),
    category,
    postedOn,
    body: bodyText,
    published: body.published === undefined ? true : body.published === 'true' || body.published === true,
  })
}

// Stores an FOI file, recording rejected files in the security log.
async function storeDocumentLogged(req) {
  try {
    return await storeDocument(req.file)
  } catch (err) {
    if (err.status === 400) audit(req.user.id, 'upload_rejected', 'FOI file rejected: content is not an allowed document type')
    throw err
  }
}

const foiList = () => ({ posts: foiPosts({ includeUnpublished: true }), categories: FOI_CATEGORIES, maxMb: config.maxDocumentMb, accepted: ACCEPTED_DOCUMENTS })

router.get('/foi', (req, res) => res.json(foiList()))

router.post('/foi', withDocument, async (req, res) => {
  const post = readFoi(req.body || {}, { hasFile: !!req.file })
  const doc = req.file ? await storeDocumentLogged(req) : null
  try {
    db.prepare(
      `INSERT INTO foi_posts (title, category, posted_on, body, file, file_name, file_type, file_size, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(post.title, post.category, post.postedOn, post.body, doc?.file ?? null, doc?.fileName ?? null, doc?.fileType ?? null, doc?.fileSize ?? null, post.published ? 1 : 0)
  } catch (err) {
    await removeDocument(doc?.file)
    throw err
  }
  res.status(201).json(foiList())
})

router.put('/foi/:id', withDocument, async (req, res) => {
  const id = intParam(req.params.id)
  const existing = db.prepare('SELECT file FROM foi_posts WHERE id = ?').get(id)
  if (!existing) throw notFound('Post')
  const removeFile = req.body?.removeFile === 'true'
  const keepsFile = !!req.file || (!!existing.file && !removeFile)
  const post = readFoi(req.body || {}, { hasFile: keepsFile })
  const doc = req.file ? await storeDocumentLogged(req) : null
  const fileCols = doc
    ? [doc.file, doc.fileName, doc.fileType, doc.fileSize]
    : removeFile
      ? [null, null, null, null]
      : null
  db.prepare(
    `UPDATE foi_posts SET title = ?, category = ?, posted_on = ?, body = ?, published = ?, updated_at = datetime('now')
     ${fileCols ? ', file = ?, file_name = ?, file_type = ?, file_size = ?' : ''} WHERE id = ?`,
  ).run(post.title, post.category, post.postedOn, post.body, post.published ? 1 : 0, ...(fileCols || []), id)
  if (fileCols) await removeDocument(existing.file)
  res.json(foiList())
})

// Publish / hide without re-sending the whole post.
router.post('/foi/:id/published', (req, res) => {
  const r = db
    .prepare("UPDATE foi_posts SET published = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.body?.published ? 1 : 0, intParam(req.params.id))
  if (!r.changes) throw notFound('Post')
  res.json(foiList())
})

router.delete('/foi/:id', async (req, res) => {
  const id = intParam(req.params.id)
  const existing = db.prepare('SELECT file FROM foi_posts WHERE id = ?').get(id)
  if (!existing) throw notFound('Post')
  db.prepare('DELETE FROM foi_posts WHERE id = ?').run(id)
  await removeDocument(existing.file)
  res.json(foiList())
})

// --- Messages from the contact form --------------------------------------------
const messageList = () => ({
  messages: db
    .prepare(
      `SELECT id, name, email, topic, message, created_at AS createdAt, read_at AS readAt, notified
       FROM messages ORDER BY created_at DESC, id DESC`,
    )
    .all()
    .map((m) => ({ ...m, read: !!m.readAt, notified: !!m.notified })),
  emailNotifications: mailEnabled(),
})

router.get('/messages', (req, res) => res.json(messageList()))
router.get('/messages/unread', (req, res) => res.json({ unread: db.prepare('SELECT COUNT(*) AS n FROM messages WHERE read_at IS NULL').get().n }))
router.post('/messages/:id/read', (req, res) => {
  const r = db
    .prepare(`UPDATE messages SET read_at = ${req.body?.read === false ? 'NULL' : "COALESCE(read_at, datetime('now'))"} WHERE id = ?`)
    .run(intParam(req.params.id))
  if (!r.changes) throw notFound('Message')
  res.json(messageList())
})
router.delete('/messages/:id', (req, res) => {
  const r = db.prepare('DELETE FROM messages WHERE id = ?').run(intParam(req.params.id))
  if (!r.changes) throw notFound('Message')
  res.json(messageList())
})

// --- Privacy requests ------------------------------------------------------------
// Workflow: new → verifying (Katoto emailed the requester) → identity verified →
// handle (delete / send a copy / correct) → completed or declined. Each step is
// logged. On closing, the free-text details are erased; the closed record is
// deleted after the retention period (server/retention.js).
const REQUEST_STATUSES = ['new', 'verifying', 'completed', 'declined']

function requestRow(id) {
  const r = db.prepare('SELECT * FROM privacy_requests WHERE id = ?').get(id)
  if (!r) throw notFound('Request')
  return r
}
const shapeRequest = (r) => ({
  id: r.id,
  reference: `PR-${String(r.id).padStart(4, '0')}`,
  type: r.type,
  label: PRIVACY_REQUEST_TYPES.find((t) => t.id === r.type)?.label || r.type,
  name: r.name,
  email: r.email,
  details: r.details,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  verifiedAt: r.verified_at,
  completedAt: r.completed_at,
  resolution: r.resolution,
  log: JSON.parse(r.log || '[]'),
})
const requestList = () => ({
  requests: db.prepare('SELECT * FROM privacy_requests ORDER BY created_at DESC, id DESC').all().map(shapeRequest),
  retentionDays: config.retention.privacyRequestsDays,
})

function logRequest(id, user, event) {
  const r = requestRow(id)
  const log = JSON.parse(r.log || '[]')
  log.push({ at: new Date().toISOString(), by: user.username, event })
  db.prepare("UPDATE privacy_requests SET log = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(log), id)
}

// Website records that can be matched to the requester's email address.
function matchesFor(r) {
  const messages = db
    .prepare(
      `SELECT id, name, email, topic, message, created_at AS createdAt, consent_version AS consentVersion, consented_at AS consentedAt
       FROM messages WHERE lower(email) = lower(?) ORDER BY created_at`,
    )
    .all(r.email)
  const otherRequests = db
    .prepare('SELECT id, type, status, created_at AS createdAt FROM privacy_requests WHERE lower(email) = lower(?) AND id != ?')
    .all(r.email, r.id)
  return { messages, otherRequests }
}

router.get('/privacy-requests', (req, res) => res.json(requestList()))

router.get('/privacy-requests/:id', (req, res) => {
  const r = requestRow(intParam(req.params.id))
  res.json({ request: shapeRequest(r), matches: r.status === 'completed' || r.status === 'declined' ? null : matchesFor(r) })
})

router.post('/privacy-requests/:id/status', (req, res) => {
  const id = intParam(req.params.id)
  const r = requestRow(id)
  const status = req.body?.status
  if (!REQUEST_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' })
  if (r.status === 'completed' || r.status === 'declined') return res.status(409).json({ error: 'This request is already closed.' })
  const closing = status === 'completed' || status === 'declined'
  const resolution = closing ? text(req.body?.resolution, 'resolution', { max: 1000, required: true, errors: {} }) : ''
  if (closing && !resolution) return res.status(400).json({ error: 'Write what was done, for the record.', errors: { resolution: 'Required.' } })
  if (status === 'completed' && !r.verified_at)
    return res.status(409).json({ error: 'Verify the requester’s identity before completing the request.' })
  if (closing) {
    // Keep only what proves the request was handled; erase the free text.
    db.prepare(
      `UPDATE privacy_requests SET status = ?, resolution = ?, details = '', completed_at = datetime('now'), completed_by = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(status, resolution, req.user.id, id)
  } else {
    db.prepare("UPDATE privacy_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id)
  }
  logRequest(id, req.user, closing ? `${status === 'completed' ? 'Completed' : 'Declined'}: ${resolution}` : status === 'verifying' ? 'Verification email sent' : 'Reopened')
  res.json(requestList())
})

router.post('/privacy-requests/:id/verify', (req, res) => {
  const id = intParam(req.params.id)
  const r = requestRow(id)
  if (r.status === 'completed' || r.status === 'declined') return res.status(409).json({ error: 'This request is already closed.' })
  db.prepare("UPDATE privacy_requests SET verified_at = datetime('now'), verified_by = ?, status = 'verifying' WHERE id = ?").run(req.user.id, id)
  logRequest(id, req.user, 'Identity verified (requester confirmed from the same email address)')
  res.json({ request: shapeRequest(requestRow(id)), matches: matchesFor(requestRow(id)) })
})

// Deletes the contact messages linked to the requester's email address.
router.post('/privacy-requests/:id/delete-messages', (req, res) => {
  const id = intParam(req.params.id)
  const r = requestRow(id)
  if (!r.verified_at) return res.status(409).json({ error: 'Verify the requester’s identity before deleting anything.' })
  if (r.status === 'completed' || r.status === 'declined') return res.status(409).json({ error: 'This request is already closed.' })
  const n = db.prepare('DELETE FROM messages WHERE lower(email) = lower(?)').run(r.email).changes
  logRequest(id, req.user, `Deleted ${n} contact message(s) linked to the requester’s email`)
  res.json({ deleted: n, request: shapeRequest(requestRow(id)), matches: matchesFor(requestRow(id)) })
})

export default router
