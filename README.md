# Katoto Project — Official Website

React site for **Katoto Project**, *Kalakbay ng bawat batang Paeteño*, a youth organization in Paete, Laguna, with an admin dashboard for managing photos, the volunteer call, news, and site text.

## Stack

- **Frontend:** React 19 + Vite, React Router, Motion, Lucide icons
- **Backend:** Node.js (24+) + Express 5, in `server/`
- **Database:** SQLite, via Node's built-in `node:sqlite`, stored at `DATA_DIR/katoto.db`
- **Images:** uploaded photos are re-encoded with sharp to WebP (full size + thumbnail), with EXIF/GPS metadata removed, and stored in `DATA_DIR/uploads/`

## First-time setup

```bash
npm install
cp .env.example .env    # then set ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD
npm run dev             # API on :8787 + site on http://localhost:5173
```

On first start the server:
- applies the database migrations;
- seeds the site text, news timeline, and two starter photo albums from the organization's files;
- creates the admin account from `ADMIN_USERNAME` / `ADMIN_INITIAL_PASSWORD`.

The password is stored only as a scrypt hash. After you sign in at **/admin/login** and change the password under *Account*, delete `ADMIN_INITIAL_PASSWORD` from `.env`.

> In `.env`, wrap any value containing `#` in double quotes, e.g. `ADMIN_INITIAL_PASSWORD="abc#123"`. Otherwise everything after `#` is read as a comment.

## Production

Step-by-step deployment on a free Google Cloud VM (systemd, Caddy HTTPS, daily backups): `deploy/README.md`.

```bash
npm run build     # builds the React app into dist/
npm start         # one Express process serves dist/, /api and /uploads, in production mode
```

Production mode (`npm start`):
- **Cookies:** sets `Secure` + `__Host-` session cookies, so it **must be served over HTTPS** (a reverse proxy, a Cloudflare tunnel, or a host that terminates TLS).
- **Headers:** turns on HSTS.
- **Initial password:** blocks every admin feature until the initial password has been changed.

Hosting needs a Node server with **persistent disk** for `DATA_DIR`, such as a VPS, Render or Railway with a volume, or a Fly.io volume. Static-only hosts can't run the admin. Back up `DATA_DIR` (database + uploads) regularly.

If the API is unreachable, the public site still renders the built-in default content, so a static-only deployment of `dist/` works read-only.

| Script | Purpose |
| --- | --- |
| `npm run dev` | API (auto-restarts on change) + Vite dev server with `/api` proxy |
| `npm run build` / `npm start` | Production build / production server |
| `npm run admin:password` | Reset or create an admin password from the command line |
| `npm run assets` | Rebuild bundled web images from the original files (Python + Pillow) |

## Admin dashboard (`/admin/dashboard`)

Sign in from the **Admin login** link in the website footer, or go to `/admin/login`.

- **Overview:**
  - *Needs attention*: initial password still in use, unpublished site text, missing Apply link, unpublished or empty albums, published photos without descriptions;
  - *Website visits* for 7, 30 or 90 days: visitors, page views, today, volunteer Apply clicks, a daily chart (with a table view), where visitors came from, devices, and clicks on contact links;
  - content counts, recent changes, and quick actions.
- **Messages:** what visitors send through the website's contact form, with an unread count in the sidebar. Open a message to read it (marks it read), reply in Gmail, Outlook or your email app, copy the sender's address, mark it unread, or delete it.
- **Photo albums:**
  - create, rename and describe albums, then publish or unpublish them;
  - upload (drag and drop, local preview, captions and image descriptions before upload);
  - edit captions, set the cover, reorder, move photos between albums;
  - delete with confirmation, which also removes the files.
- **Call for volunteers:** heading, intro, qualifications, application steps, the Apply link and the second button.
- **Site content:** homepage introduction, About text, pillar descriptions and captions.
- **Officers & committees:** the term, officer groups and their people, barangay coordinators, and each committee's head and assistant head. Saved as a draft with the rest of the site text.
- **News & updates:** add, edit, reorder, publish or hide, and delete.
- **Freedom of Information:** post financial reports, audit results, minutes and announcements, with an optional file (PDF, JPEG, PNG, WebP, Word .docx or Excel .xlsx, up to `MAX_DOCUMENT_MB`). Each post can be published or hidden, edited (replace or remove the file) and deleted.
- **Contact & links:** email, phone, Facebook page, address, donation channel.
- **Account:** change password. Changing it signs out other sessions.

**Publishing:**
- **Site text** saves as a *draft*. *Preview* opens the site showing the draft (only for a signed-in admin), and *Publish* makes it live.
- **Albums, news and FOI posts** each have their own Published switch.

## Security

- **Passwords:** scrypt hashes. No credentials in client code or web storage, and passwords are never logged or returned.
- **Sessions:**
  - random tokens, stored hashed in the database;
  - cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` + `__Host-` in production;
  - 8-hour expiry.
- **Request forgery:** state-changing requests need a matching `Origin` and a custom `X-Requested-With` header.
- **Account lockout:** after 5 consecutive wrong passwords (at sign-in, or when re-entering the current password for an account change), the account is locked in the database (`users.is_locked`, `failed_login_attempts`, `locked_at`, `last_failed_login_at`). Even the correct password is then refused, every session ends, and one security alert is emailed to the registered address (`ADMIN_EMAIL`). Each check reserves an attempt atomically first, so parallel requests can't test more than 5 passwords. Unknown usernames get identical answers. There is also a limit of 20 attempts per IP every 15 minutes.
- **Recovery:** */admin/recover* emails a single-use link (30 minutes) to the registered address; the account unlocks only when a new password is set through it, and all sessions end. Recovery emails are capped at 3 per hour per account and 5 requests per hour per IP. Fallback with server access: `npm run admin:password` (also unlocks).
- **Verified account changes:** changing the password or username needs the current password and then a confirmation link sent to the registered email; nothing changes before it is confirmed, and every session ends afterwards. Confirmation emails follow each change.
- **Email tokens:** 32 random bytes; only a SHA-256 hash, bound to its purpose, is stored. They are single-use, expire after 30 minutes, are accepted only by their own endpoint, and travel in the URL fragment (`#token=`), so they never reach server logs or `Referer` headers. Invalid submissions are limited to 10 per IP every 15 minutes. Links are built only from `APP_BASE_URL` (https required in production), never from the request's Host header.
- **Security log:** *Admin → Account & security* shows status, pending changes, and the last 100 events (no passwords, tokens, or IPs); events are kept for `SECURITY_LOG_RETENTION_DAYS` (365).
- **Admin API:** every route checks the session on the server. The `/admin` pages' redirect is only a convenience.
- **Uploads:**
  - type and size are checked;
  - files are decoded by sharp, so a non-image renamed `.jpg` is rejected;
  - files get random names and metadata is stripped.
- **FOI documents:** the type is checked from the file's contents (a renamed HTML file is rejected), images are re-saved without metadata, and files live in `DATA_DIR/documents`, outside `/uploads`. They are served through `/api/public/foi/:id/file` only while the post is published (or to a signed-in admin); Word and Excel files download instead of opening.
- **Headers:** strict Content Security Policy (no inline scripts or styles), HSTS, `nosniff`, `Referrer-Policy: no-referrer`, a Permissions-Policy that turns off unused browser features, and no framing; `/admin` is marked `noindex`.
- **Passwords:** Argon2id (OWASP settings, built into Node ≥ 24.7). Older scrypt hashes upgrade automatically at the next sign-in.
- **Development server:** serves only `src/`, `public/`, and `node_modules/`; the database, server code, scripts, docs, and `.env` are refused. Never expose `npm run dev` publicly (no tunnels); use `npm run build && npm start`.
- **Security log:** also records blocked requests (no session, failed CSRF check), rejected uploads, and every admin change (action only).
- **Checks:** `npm run security:audit` (dependency audit + secret scan of the project and `dist/`), `npm run security:secrets`, `npm run backup`. Deployment, Gmail set-up, credential rotation, backups, and incident response: `docs/security-runbook.md`.

## Email

- **Email links** on the website (Apply by email, the email address, FOI requests, partnership inquiries) open a small chooser: Gmail, Outlook, Yahoo Mail, the device's email app, or copy the address. A plain `mailto:` link does nothing on devices without an email app set up, which is common on Windows PCs and on phones that use webmail.
- **The contact form sends for real:** messages are saved on the server and appear in *Admin → Messages*. If the server can't be reached, the form offers to send the same text by email instead.
- **Spam protection:** a hidden honeypot field, 5 messages per hour per connection, 200 per day for the whole site, and same-site requests only.
- **Optional email alerts:** set the `SMTP_*` settings in `.env` (see `.env.example`) to also get each message by email. Reply-To is the visitor, so replying answers them directly. For Gmail, use an App Password (2-Step Verification must be on), never the account password.

## Privacy

- **Pages:** `/privacy-policy`, `/terms-of-service`, `/cookie-policy`, and `/data-deletion` (privacy requests), linked from the footer with a *Privacy settings* button.
- **Visit statistics are opt-in:** a first-visit banner offers *Accept all*, *Reject non-essential*, and *Customize* (equal weight). Nothing is counted until the visitor allows it. The choice is kept in `localStorage` (`katoto-privacy-choices`) and can be changed from the footer.
- **Consent:** the contact form has an unticked consent box, checked again on the server, and stores the consent version and time with each message. Photo uploads require the officer to confirm publishing permission, including from a parent or guardian for minors.
- **Privacy requests:** stored and handled in *Admin → Privacy requests*: verify by email, delete matching messages (only after verification, enforced on the server), and close with an outcome note. Every step is logged; closing erases the request details.
- **Retention:** messages and closed requests are deleted automatically (`MESSAGE_RETENTION_DAYS`, `PRIVACY_REQUEST_RETENTION_DAYS`, both 365 by default); visit statistics after 400 days.
- The full audit, open questions, and items for legal review are in `docs/compliance-audit.md`; asset licenses are in `docs/asset-inventory.md`.

## Visit statistics

With the visitor's permission, the public site sends one anonymous event per page load, and one when someone clicks the volunteer Apply button, the Facebook page, an email link, or the phone number (`POST /api/public/event`). Counting happens on this server; no third-party analytics.

- **No cookies or browser storage**, and **no IP addresses saved**. A visitor is a hash of IP + browser with a salt that is replaced every day, so people can't be followed from one day to the next. "Visitors" over a period therefore adds up daily visitors.
- Only the referring site's name is kept (e.g. `facebook.com`), not the full address.
- Not counted: bots, browsers sending Do Not Track or Global Privacy Control, signed-in admins, and previews.
- Events older than 400 days are deleted. Days follow `STATS_TIME_ZONE` (default `Asia/Manila`).

## Where things live

| Path | What it holds |
| --- | --- |
| `server/` | Express app: `db.js` (migrations), `seed.js`, `auth.js`, `passwords.js`, `images.js`, `content.js`, `stats.js`, `routes/` |
| `src/data/siteDefaults.js` | Default editable content (seed + offline fallback), including the official volunteer qualifications |
| `src/data/organization.js` | Fixed organization facts: officers, objectives, accreditation, governance |
| `src/site/SiteContext.jsx` | Loads published content from the API for the public site |
| `src/components/` | Public sections (`Volunteer.jsx`, `Gallery.jsx` = photo albums, …) |
| `src/admin/` | Admin app: login, layout, pages |

## Sources and open items

All content comes from the files in this folder, plus the official volunteer qualifications supplied by Katoto Project.

The Facebook page blocks automated access: every request returns HTTP 400 or a login wall, so **no Facebook photos could be retrieved**. The two starter albums use the only authentic photos available locally:
- the six pillar photos cut from the "6 Pillars" graphic, about 180 px each;
- the accreditation certificate and the "6 Pillars" poster.

**To do:** an admin should upload event albums from Katoto's own originals via *Photo albums*. Originals give much better quality than downloads from Facebook.

Items needing confirmation are tagged `CONFIRM:` in `src/data/organization.js`.
