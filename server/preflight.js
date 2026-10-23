import fs from 'node:fs'
import path from 'node:path'
import { db } from './db.js'
import { config } from './config.js'
import { mailEnabled } from './mailer.js'

// Start-up checks for production. Names settings, never prints their values.
// (The check that DATA_DIR is not publicly served runs earlier, in config.js.)
export function preflight() {
  if (!config.isProduction) return
  const warn = (msg) => console.warn(`[preflight] WARNING: ${msg}`)

  if (!config.appBaseUrl) warn('APP_BASE_URL is missing or not https://, so recovery and verification links are disabled.')
  if (!mailEnabled()) warn('SMTP settings are missing: lockout alerts, recovery, and account-change verification emails cannot be sent.')
  if (!config.adminEmail) warn('ADMIN_EMAIL is not set; accounts without a registered email cannot be recovered by email.')

  const user = db.prepare('SELECT must_change_password AS m FROM users ORDER BY id LIMIT 1').get()
  if (user?.m) warn('The admin account still uses its initial password. Change it before the site is public.')
  else if (process.env.ADMIN_INITIAL_PASSWORD) warn('ADMIN_INITIAL_PASSWORD is still set but no longer needed. Remove it from the server environment.')

  // On Linux/macOS, the environment file and data should be private to the server account.
  if (process.platform !== 'win32') {
    for (const p of [path.join(config.root, '.env'), config.dataDir]) {
      if (fs.existsSync(p) && fs.statSync(p).mode & 0o077) warn(`${path.basename(p)} is readable by other users on this machine (chmod ${p.endsWith('.env') ? '600' : '700'}).`)
    }
  }
}
