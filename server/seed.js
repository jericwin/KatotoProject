import fs from 'node:fs/promises'
import path from 'node:path'
import { db } from './db.js'
import { config } from './config.js'
import { hashPassword } from './passwords.js'
import { seedContent } from './content.js'
import { storeImage } from './images.js'
import { defaultNews } from '../src/data/siteDefaults.js'
import { pillarText } from '../src/data/pillarText.js'

const pillarAlt = {
  education: 'Children holding clear plastic packs, standing with Katoto members in front of a Katoto Project banner outdoors.',
  health: 'Volunteers in white shirts preparing food from large cooking pots under the trees.',
  'youth-empowerment': 'A group of Katoto members in matching navy shirts posing together indoors.',
  'culture-arts': 'A large group of children holding up papers in front of a barangay hall, with Katoto members among them.',
  environment: 'Katoto members working on a steep grassy hillside, one taking a selfie in the foreground.',
  'good-governance': 'Katoto representatives on stage with other awardees beneath an “Outstanding Volunteer” banner.',
}

// Creates the first admin from ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD. Runs
// only while the users table is empty; the password is stored as a scrypt hash
// and is never logged.
async function seedAdmin() {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
    if (config.isVercel) {
      db.prepare("UPDATE users SET must_change_password = 0 WHERE username = 'katoto'").run()
    }
    // Accounts created before emails were stored get the configured address.
    if (config.adminEmail)
      db.prepare("UPDATE users SET email = ? WHERE email IS NULL OR email = ''").run(config.adminEmail)
    return
  }
  const username = process.env.ADMIN_USERNAME?.trim() || 'katoto'
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'katotoproject#2020'
  const mustChange = config.isVercel ? 0 : 1
  db.prepare('INSERT INTO users (username, password_hash, must_change_password, email) VALUES (?, ?, ?, ?)').run(
    username,
    await hashPassword(password),
    mustChange,
    config.adminEmail || null,
  )
  console.log(`[seed] Created admin "${username}" from environment.`)
}

function seedNews() {
  if (db.prepare('SELECT COUNT(*) AS n FROM news').get().n > 0) return
  const insert = db.prepare('INSERT INTO news (date_label, title, body, tag, position, published) VALUES (?, ?, ?, ?, ?, 1)')
  for (const n of defaultNews) insert.run(n.dateLabel, n.title, n.body, n.tag, n.position)
}

async function addPhoto(albumId, sourcePath, caption, alt, position) {
  const stored = await storeImage(await fs.readFile(sourcePath))
  const { lastInsertRowid } = db
    .prepare('INSERT INTO photos (album_id, file, thumb, width, height, caption, alt, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(albumId, stored.file, stored.thumb, stored.width, stored.height, caption, alt, position)
  return Number(lastInsertRowid)
}

// Starter albums from the authentic photos already in the project.
async function seedAlbums() {
  if (db.prepare('SELECT COUNT(*) AS n FROM albums').get().n > 0) return
  const assets = path.join(config.root, 'src', 'assets')

  const pillarsAlbum = Number(
    db
      .prepare('INSERT INTO albums (title, description, published, position) VALUES (?, ?, 1, 0)')
      .run('The six pillars in action', 'One snapshot from each of Katoto’s six pillars, from the organization’s “6 Pillars” graphic.')
      .lastInsertRowid,
  )
  let cover = null
  for (const [i, p] of pillarText.entries()) {
    const id = await addPhoto(pillarsAlbum, path.join(assets, `pillar-${p.id}.webp`), `${p.name}: ${p.caption}`, pillarAlt[p.id], i)
    cover ??= id
  }
  db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?').run(cover, pillarsAlbum)

  const docsAlbum = Number(
    db
      .prepare('INSERT INTO albums (title, description, published, position) VALUES (?, ?, 1, 1)')
      .run('Recognition & documents', 'Katoto’s provincial accreditation and its own “6 Pillars” graphic.')
      .lastInsertRowid,
  )
  const cert = await addPhoto(
    docsAlbum,
    path.join(assets, 'yda-accreditation-2026.webp'),
    'Certificate of Accreditation, Youth Development Affairs Office of Laguna, September 18, 2026.',
    'Certificate of Accreditation from the Provincial Government of Laguna, Youth Development Affairs Office, certifying Katoto Project Youth Organization, dated 18 September 2026.',
    0,
  )
  await addPhoto(
    docsAlbum,
    path.join(assets, 'six-pillars-poster.webp'),
    '6 Pillars of Katoto Project.',
    'Katoto Project graphic titled “6 Pillars of Katoto Project” showing the logo and six circular photos labelled Education, Health, Youth Empowerment, Culture and Arts, Environment, and Good Youth Governance.',
    1,
  )
  db.prepare('UPDATE albums SET cover_photo_id = ? WHERE id = ?').run(cert, docsAlbum)
}

export async function seed() {
  seedContent()
  seedNews()
  await seedAlbums()
  await seedAdmin()
}
