# Security runbook

How to deploy the Katoto Project website safely, rotate credentials, back up, and respond to incidents. No real secret belongs in this file; use placeholders only.

## 1. Production environment variables

Set these in the hosting provider's secret or environment settings (preferred), or in a `.env` file on the server that is readable only by the server account (`chmod 600 .env`). Never put them in the front end: only `VITE_`-prefixed variables reach the browser, and no secret may use that prefix.

| Variable | Example (placeholder) | Secret? | Notes |
|---|---|---|---|
| `APP_BASE_URL` | `https://katoto.example` | no | Required for emailed links; must be https. |
| `ADMIN_EMAIL` | `admin-address@example.com` | no | Registered admin email: alerts, recovery, verification. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.gmail.com` / `465` / `true` | no | |
| `SMTP_USER` | `sender-address@example.com` | no | |
| `SMTP_PASS` | `<gmail-app-password>` | **yes** | Gmail **App Password** only, never the account password. |
| `MAIL_FROM`, `NOTIFY_EMAIL` | `sender-address@example.com` | no | |
| `ADMIN_USERNAME` | `<admin-username>` | no | Used only to create the first admin. |
| `ADMIN_INITIAL_PASSWORD` | `<one-time-setup-password>` | **yes** | Only for first start. Remove it after the first password change (the server warns while it is set). |
| `DATA_DIR` | `/var/lib/katoto` | no | Persistent, private (chmod 700), backed up, outside `dist/` (the server refuses otherwise). |
| `TRUST_PROXY` | `loopback` or `1` | no | `1` behind a platform load balancer, so rate limits see real visitor IPs. |
| `PORT`, `SESSION_HOURS`, `MAX_UPLOAD_MB`, `MAX_DOCUMENT_MB`, `STATS_TIME_ZONE`, `MESSAGE_RETENTION_DAYS`, `PRIVACY_REQUEST_RETENTION_DAYS`, `SECURITY_LOG_RETENTION_DAYS`, `ALLOWED_ORIGINS` | see `.env.example` | no | |

Production mode is turned on by `npm start` (`--production`). It sets `NODE_ENV=production` and enables `Secure` + `__Host-` cookies, HSTS, and the initial-password lock. At start-up it prints warnings (names only, never values) for missing or unsafe settings.

## 2. Gmail set-up

1. Sign in to the Gmail account Katoto uses and turn on **2-Step Verification**.
2. Google Account → Security → **App passwords** → create one named e.g. "Katoto website".
3. Store it only as `SMTP_PASS` in the server's secret settings. Don't email it, paste it in chats, or save it in documents.
4. Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`.
5. Test: in the admin, start a password change. A verification email should arrive, and *Account & security* shows "verification emailed".

## 3. Deployment checklist

- [ ] Node.js ≥ 24.7 on the server (`node -v`).
- [ ] `npm ci && npm run build`, then `npm start` (never `npm run dev` or `vite` on a public host; the dev server is for this computer only).
- [ ] HTTPS in front of the app (platform TLS, reverse proxy, or Cloudflare). Plain HTTP must redirect to HTTPS.
- [ ] Environment variables set as in section 1; `ADMIN_INITIAL_PASSWORD` removed after the first password change.
- [ ] `DATA_DIR` on persistent storage, private to the server account, included in backups.
- [ ] Only the app's port is reachable; the database is a local file (no database port to expose).
- [ ] `npm run security:audit` passes (dependency audit + secret scan).
- [ ] After deploying, check the headers (`curl -I https://<domain>/`): `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] `https://<domain>/.env`, `/server-data/katoto.db`, `/package.json` return 404.
- [ ] Sign in, change the initial password (email verification), and confirm the security alert and recovery emails arrive.
- [ ] Scheduled backups (section 5) running, with a restore tested once.

## 4. Credential rotation

| Credential | When | How |
|---|---|---|
| Gmail App Password | If it may have been seen by anyone else, or yearly | Google Account → Security → App passwords → **revoke** the old one, create a new one, update `SMTP_PASS`, restart, send a test. |
| Admin password | If shared or suspected | Admin → Account & security → Change password (email-verified). Without access: `/admin/recover`, or `npm run admin:password` on the server. Both sign out every session. |
| All admin sessions | Suspected session theft | Change the password (ends every session), or on the server: `DELETE FROM sessions;` in `DATA_DIR/katoto.db`. |
| Recovery/verification links | Suspected leak | They expire after 30 minutes and work once; requesting a new one or changing the password invalidates outstanding links. |

There is no session-signing secret to rotate: sessions are random tokens stored hashed in the database.

## 5. Backups

- `npm run backup` writes a consistent copy of the database, uploads, and FOI documents to `BACKUP_DIR` (default `./backups`, git-ignored), keeping the newest `BACKUP_KEEP` (14).
- Schedule it daily (cron or the host's scheduler). Copy backups **encrypted** to off-site storage that only the people who restore the site can read. Backups contain personal data and password hashes.
- Restore: stop the server, replace `DATA_DIR/katoto.db` and the `uploads`/`documents` folders with a backup's copies (delete any `katoto.db-wal`/`-shm`), and start the server.
- Deleted personal data stays in backups until they rotate out (the Privacy Policy says so).

## 6. Incident response

1. **Contain:** if an admin account may be compromised, change its password (or `npm run admin:password`), which ends all sessions. If the server may be compromised, take it offline.
2. **Rotate:** the Gmail App Password and any other credential on the server (section 4).
3. **Investigate:** Admin → Account & security → security log (failed sign-ins, lockouts, resets, blocked requests, rejected uploads) and "Recent admin changes"; server logs.
4. **Restore** from a backup made before the incident, if content was altered.
5. **Notify:** if personal data may have been accessed, assess the breach-notification duties under the Data Privacy Act (National Privacy Commission) with a privacy professional.
6. Record what happened and what was changed.

## 7. Routine checks

- Monthly: `npm run security:audit`; update dependencies (`npm outdated`, patch releases first) and re-run the tests.
- Before every deploy: `npm run security:secrets` (also scans the built `dist/`).
- Review the security log for repeated lockouts or blocked requests.
