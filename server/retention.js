import { db } from './db.js'
import { config } from './config.js'

// Automatic deletion of personal data that is past its retention period.
// Runs at start-up and then daily. Visit statistics are pruned in stats.js.
export function purgeExpired() {
  const { messagesDays, privacyRequestsDays } = config.retention
  const messages = db.prepare(`DELETE FROM messages WHERE created_at < datetime('now', ?)`).run(`-${messagesDays} days`).changes
  const requests = db
    .prepare(`DELETE FROM privacy_requests WHERE status IN ('completed', 'declined') AND completed_at < datetime('now', ?)`)
    .run(`-${privacyRequestsDays} days`).changes
  const events = db.prepare(`DELETE FROM security_events WHERE created_at < datetime('now', ?)`).run(`-${config.retention.securityEventsDays} days`).changes
  // Used or expired email tokens are useless after a day; keep them that long for the log.
  db.prepare('DELETE FROM auth_tokens WHERE expires_at < ?').run(Date.now() - 24 * 3600 * 1000)
  if (events) console.log(`[retention] deleted ${events} old security event(s)`)
  if (messages || requests) console.log(`[retention] deleted ${messages} old message(s) and ${requests} closed privacy request(s)`)
}

purgeExpired()
setInterval(purgeExpired, 24 * 3600 * 1000).unref()
