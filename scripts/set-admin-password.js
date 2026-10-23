// Sets (or resets) an admin password from the command line, e.g. if the
// password is lost. Creates the user if it doesn't exist.
//   npm run admin:password
import readline from 'node:readline'
import { db } from '../server/db.js'
import { hashPassword, validateNewPassword } from '../server/passwords.js'

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : '')
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer)
    }),
  )
}

const username = (await ask('Admin username: ')).trim()
if (!username) process.exit(1)
const password = await ask('New password: ', { hidden: true })
const problem = validateNewPassword(password, username)
if (problem) {
  console.error(problem)
  process.exit(1)
}
if ((await ask('Repeat password: ', { hidden: true })) !== password) {
  console.error('Passwords do not match.')
  process.exit(1)
}
const hash = await hashPassword(password)
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
const email = (process.env.ADMIN_EMAIL || '').trim() || null
if (existing) {
  // Server access is the fallback recovery path: it also unlocks the account.
  db.prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'),
       failed_login_attempts = 0, is_locked = 0, locked_at = NULL WHERE id = ?`,
  ).run(hash, existing.id)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id)
  db.prepare("UPDATE auth_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").run(existing.id)
  db.prepare('INSERT INTO security_events (user_id, event, detail) VALUES (?, ?, ?)').run(
    existing.id,
    'password_reset',
    'Password reset from the server command line; account unlocked and all sessions signed out',
  )
  console.log(`Password updated for "${username}". The account is unlocked and existing sessions were signed out.`)
} else {
  db.prepare('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)').run(username, hash, email)
  console.log(`Admin "${username}" created.`)
}
