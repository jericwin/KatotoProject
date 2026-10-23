import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'

// Readable only by the account that runs the server (no effect on Windows).
for (const dir of [config.dataDir, config.uploadsDir, config.documentsDir]) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(dir, 0o700)
    } catch {
      // Ignore permission warnings in containerized environments
    }
  }
}

export const db = new DatabaseSync(path.join(config.dataDir, 'katoto.db'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')

// Ordered, append-only migrations. Never edit a migration that has shipped;
// add a new one instead.
const migrations = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     must_change_password INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     password_changed_at TEXT
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE content (
     key TEXT PRIMARY KEY,
     draft TEXT NOT NULL,
     published TEXT NOT NULL,
     updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     published_at TEXT
   );
   CREATE TABLE news (
     id INTEGER PRIMARY KEY,
     date_label TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     tag TEXT NOT NULL DEFAULT 'Announcement',
     published INTEGER NOT NULL DEFAULT 1,
     position INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE albums (
     id INTEGER PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     published INTEGER NOT NULL DEFAULT 0,
     cover_photo_id INTEGER,
     position INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE photos (
     id INTEGER PRIMARY KEY,
     album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
     file TEXT NOT NULL UNIQUE,
     thumb TEXT NOT NULL,
     width INTEGER NOT NULL,
     height INTEGER NOT NULL,
     caption TEXT NOT NULL DEFAULT '',
     alt TEXT NOT NULL DEFAULT '',
     position INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX photos_album ON photos(album_id, position);`,
  // Visit statistics. No IPs or cookies: `visitor` is a hash keyed with a
  // salt that is replaced every day, so visitors can't be linked across days.
  `CREATE TABLE visit_events (
     id INTEGER PRIMARY KEY,
     day TEXT NOT NULL,
     type TEXT NOT NULL,
     visitor TEXT NOT NULL,
     referrer TEXT NOT NULL DEFAULT '',
     device TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX visit_events_day ON visit_events(day, type);
   CREATE TABLE visit_salts (
     day TEXT PRIMARY KEY,
     salt TEXT NOT NULL
   );`,
  // Freedom of Information posts: announcements and/or an attached document.
  `CREATE TABLE foi_posts (
     id INTEGER PRIMARY KEY,
     title TEXT NOT NULL,
     category TEXT NOT NULL,
     posted_on TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     file TEXT UNIQUE,
     file_name TEXT,
     file_type TEXT,
     file_size INTEGER,
     published INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX foi_posts_date ON foi_posts(posted_on DESC, id DESC);`,
  // Messages sent through the website's contact form.
  `CREATE TABLE messages (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     topic TEXT NOT NULL,
     message TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     read_at TEXT,
     notified INTEGER NOT NULL DEFAULT 0
   );
   CREATE INDEX messages_created ON messages(created_at DESC);`,
  // Privacy: consent evidence on contact messages, publishing permission on
  // uploaded photos, and data-subject requests (deletion, access, correction).
  `ALTER TABLE messages ADD COLUMN consent_version TEXT;
   ALTER TABLE messages ADD COLUMN consented_at TEXT;
   ALTER TABLE photos ADD COLUMN permission_confirmed_at TEXT;
   ALTER TABLE photos ADD COLUMN uploaded_by INTEGER;
   CREATE TABLE privacy_requests (
     id INTEGER PRIMARY KEY,
     type TEXT NOT NULL,
     name TEXT NOT NULL,
     email TEXT NOT NULL,
     details TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'new',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     verified_at TEXT,
     verified_by INTEGER,
     completed_at TEXT,
     completed_by INTEGER,
     resolution TEXT NOT NULL DEFAULT '',
     log TEXT NOT NULL DEFAULT '[]'
   );
   CREATE INDEX privacy_requests_status ON privacy_requests(status, created_at);`,
  // Admin account security: persistent lockout, registered email, single-use
  // email tokens (only their hashes), and a security audit log.
  `ALTER TABLE users ADD COLUMN email TEXT;
   ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE users ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE users ADD COLUMN locked_at TEXT;
   ALTER TABLE users ADD COLUMN last_failed_login_at TEXT;
   CREATE TABLE auth_tokens (
     id INTEGER PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     purpose TEXT NOT NULL,
     token_hash TEXT NOT NULL UNIQUE,
     payload TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     expires_at INTEGER NOT NULL,
     used_at TEXT
   );
   CREATE INDEX auth_tokens_user ON auth_tokens(user_id, purpose);
   CREATE TABLE security_events (
     id INTEGER PRIMARY KEY,
     user_id INTEGER,
     event TEXT NOT NULL,
     detail TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX security_events_user ON security_events(user_id, created_at);`,
]

db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version))
migrations.forEach((sql, i) => {
  const version = i + 1
  if (applied.has(version)) return
  db.exec('BEGIN')
  try {
    db.exec(sql)
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))").run(version)
    db.exec('COMMIT')
    console.log(`[db] applied migration ${version}`)
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
})

export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
