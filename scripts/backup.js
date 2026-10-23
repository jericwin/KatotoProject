// Makes a consistent backup of the database, uploaded photos, and FOI
// documents while the site keeps running.
//   npm run backup
// Backups contain personal data and password hashes: store them encrypted and
// off the web server, readable only by the people who restore the site.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config } from '../server/config.js'

const backupRoot = path.resolve(config.root, process.env.BACKUP_DIR || 'backups')
const keep = Number(process.env.BACKUP_KEEP) || 14
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = path.join(backupRoot, `katoto-${stamp}`)

fs.mkdirSync(target, { recursive: true, mode: 0o700 })
const db = new DatabaseSync(path.join(config.dataDir, 'katoto.db'))
db.exec(`VACUUM INTO '${path.join(target, 'katoto.db').replaceAll("'", "''")}'`)
db.close()
for (const dir of ['uploads', 'documents']) {
  const from = path.join(config.dataDir, dir)
  if (fs.existsSync(from)) fs.cpSync(from, path.join(target, dir), { recursive: true })
}
if (process.platform !== 'win32') fs.chmodSync(target, 0o700)

// Keep only the newest backups.
const old = fs
  .readdirSync(backupRoot)
  .filter((n) => n.startsWith('katoto-'))
  .sort()
  .slice(0, -keep)
for (const n of old) fs.rmSync(path.join(backupRoot, n), { recursive: true, force: true })

console.log(`Backup written to ${target}${old.length ? ` (removed ${old.length} older backup(s))` : ''}`)
