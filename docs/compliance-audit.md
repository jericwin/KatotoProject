# Privacy, security, accessibility and compliance audit

Audit date: October 23, 2026. This records what the website actually does, what was changed, and what still needs a decision. It is not a legal opinion, and the website should not be described as "compliant" or "secure" on the strength of it.

## Data inventory

| Data | Where it comes from | Purpose | Required? | Who can see it | Retention |
|---|---|---|---|---|---|
| Contact messages: name, email, topic, message, consent version and time | Contact form | Reply to the sender | Yes (no optional fields) | Signed-in officers; copy emailed to Katoto's Gmail if SMTP is configured | Auto-deleted after `MESSAGE_RETENTION_DAYS` (default 365). Gmail copies: manual. |
| Privacy requests: type, name, email, details, handling log | `/data-deletion` form | Verify and handle data-subject requests; prove handling | Name, email; details only for photo, correction, and other | Signed-in officers | Details erased on closing; record auto-deleted `PRIVACY_REQUEST_RETENTION_DAYS` (default 365) after closing |
| Visit events: day, event type, referrer host, device type, daily-salted visitor hash | Browser, **only after opt-in** | Anonymous usage statistics | Optional, off by default | Signed-in officers (aggregates only) | 400 days. The salt is destroyed daily. No IP stored. |
| IP address (memory only) | Every request | Rate limiting (forms, sign-in, statistics) | Technical | Nobody; never written to disk | Up to 1 day in memory |
| Admin users: username, scrypt hash, password-change flags; sessions (hashed token, expiry) | Setup / sign-in | Access control | Officers only | Server | Sessions expire after 8 h and are purged |
| Photos (may show identifiable people and minors) | Uploaded by officers | Activity albums | n/a | Public when published | Until deleted; permission confirmation and uploader stored per photo |
| Officer, coordinator, and committee names | Admin content | Transparency about leadership | n/a | Public | Until edited |
| FOI documents | Uploaded by officers | Transparency | n/a | Public when published | Until deleted |

Not collected: birth dates, ID documents, government numbers, payment data, online volunteer applications, advertising identifiers, cookies for visitors.

## Requirement status

| # | Requirement | Status | What was done / why |
|---|---|---|---|
| 1 | Privacy Policy | Implemented | `/privacy-policy`. Written from the inventory above. Retention figures and the email-alert statement are read from the running server's configuration. Unknown facts (legal registration, DPO, hosting provider, backups) are shown as "to be confirmed". |
| 2 | Terms of Service | Implemented | `/terms-of-service`, plain language, no waivers or liability exclusions. |
| 3 | Refund Policy | **Not applicable** | The website sells nothing and processes no payments. Donations go directly through GCash, outside the website. No refund page was created. |
| 4 | Cookie Policy | Implemented | `/cookie-policy` lists the only two items stored: the privacy-choice entry (localStorage) and the admin sign-in cookie. |
| 5 | Consent banner | Implemented | Accept all, Reject non-essential, and Customize, with identical styling for accept and reject. Statistics are off until allowed; scrolling or closing is not consent. A footer "Privacy settings" link reopens it. The choice version and time are stored; changing `PRIVACY_CHOICES_VERSION` asks again. |
| 6 | Form consents | Implemented | Contact form: an unticked consent box linked to the policy, validated on the server, with version and time stored per message. No marketing consent exists to bundle. Privacy-request form: a notice only, since handling a request is not consent-based. Photo uploads: officers must confirm publishing permission, including from a parent or guardian for minors (server-validated and recorded). |
| 7 | Data minimization | Reviewed | No unnecessary fields were found in the forms. Personal data that previously had no retention limit (messages, privacy requests) now has automatic deletion. Visit statistics became opt-in. FOI upload help reminds officers to remove unneeded personal details. |
| 8 | Third-party SDKs and dependencies | Reviewed | Runtime third parties: none (self-hosted fonts, no CDNs, analytics, embeds, or maps). Outbound links (Facebook, webmail) load only on click. Server-side: Gmail SMTP, when configured, receives contact messages. All 16 npm packages are used and permissively licensed; `npm audit`: 0 vulnerabilities. |
| 9 | Dark patterns | Reviewed / fixed | Equal-weight consent buttons, nothing pre-ticked, no countdowns or false urgency, easy withdrawal, neutral wording on rejection. Donation copy contains no pressure. |
| 10 | Hidden fees | **Not applicable** | No checkout, fees, or payments. The Terms state that the website charges nothing. |
| 11 | Fake reviews and testimonials | Reviewed: none found | No testimonials, ratings, or endorsements exist. |
| 12 | Unsupported claims | Reviewed | Every statistic (founded 2020, 36 members, 10 coordinators, 6 pillars, accreditation) traces to the 2026 profile or certificate. The policy avoids claiming encryption, full security, or compliance. Items still marked `CONFIRM:` in `src/data/organization.js` stay flagged. |
| 13 | Alt text | Implemented | All meaningful images have alt text. The hero orb photos are now `alt=""` because the link label names the destination and the same photos are described in the Pillars section. Upload previews get "Preview of <file name>". Admin-entered photo descriptions fall back to captions. |
| 14 | Colour contrast | Verified | axe-core (WCAG 2.0/2.1/2.2 A and AA plus best practices) reports 0 violations on all public pages and admin pages at 1280px and 375px. |
| 15 | Keyboard navigation | Verified | Skip link; mobile menu with focus trap and Escape; email chooser, privacy settings, confirm dialogs and the photo viewer use native `<dialog>` (focus moves in, Escape closes, focus returns); one `h1` per page. Fixed: links such as `/#volunteer` didn't scroll to their section on arrival. |
| 16 | Organization details | Implemented with placeholders | Name, location, email, Facebook, and YDAO accreditation (with Organization ID) come from documents. Legal registration status and the DPO are shown as "to be confirmed"; the DPO is editable under Admin → Contact & links. |
| 17 | Minors (ages 15–30) | Implemented as far as the website goes | Official eligibility is shown unchanged. The website collects no applications or birth dates. Contact form and policy advise under-18s to involve a parent or guardian; guardians can make requests on a minor's behalf; photo uploads require guardian permission for minors. Whether the website must obtain *verified* parental consent before processing a minor's contact message is a **legal question** (see below). |
| 18 | Unsubscribe links | **Not applicable** | The website sends no newsletters or bulk email. Its only emails are internal alerts to Katoto. Any future mailing list must include a working unsubscribe from the start. |
| 19 | Font and image licenses | Documented | `docs/asset-inventory.md`. Fonts are OFL-1.1, icons ISC. Images are organization-provided; permission of people pictured is marked "to confirm". |
| 20 | Data deletion process | Implemented | `/data-deletion` form → stored request with reference → admin workflow: verify by email reply → find matching records → delete (blocked until verified, enforced on the server) → close with a required outcome note (details erased) → auto-purge. Every step is logged. Gmail copies, photos, and backups are handled by hand, as the workflow checklist states. |

## Decisions and confirmations needed from Katoto Project

- Legal registration status and registered name/number (if any) beyond the YDAO accreditation.
- Who is the **Data Protection Officer** (enter it in Admin → Contact & links), and whether Katoto must register with the National Privacy Commission.
- Retention periods: 365 days for messages and closed privacy requests are proposed defaults. Confirm them or set `MESSAGE_RETENTION_DAYS` / `PRIVACY_REQUEST_RETENTION_DAYS`.
- Hosting provider, server location, and backup schedule (the policy then names them).
- Written permission from people in the existing pillar photos (and from parents or guardians of minors); use of the Paete seal in the logo.
- Consent of officers, coordinators, and committee heads to having their names published.
- Whether visit statistics should stay opt-in, or rely on legitimate interest with an opt-out (a legal and organizational choice; opt-in is the cautious default implemented).

## For review by a qualified privacy professional

- The lawful bases chosen (consent for the contact form and statistics; legitimate interest for technical data).
- The processing of contact messages from people aged 15–17 without verified parental consent.
- The data-subject rights wording, response timelines (none are promised), and the breach-notification statement.
- Whether the daily-salted visitor hash counts as personal data, and whether the opt-in banner is sufficient.
- Google (Gmail) as a service provider receiving message content: whether a data-sharing or outsourcing agreement is needed.
- The Terms of Service as a whole, including the "contact us first" wording; no governing-law or dispute clause was invented.

## External configuration

See `.env.example`: `ADMIN_*`, `SMTP_*` (Gmail App Password), `MAIL_FROM`, `NOTIFY_EMAIL`, `MESSAGE_RETENTION_DAYS`, `PRIVACY_REQUEST_RETENTION_DAYS`, `STATS_TIME_ZONE`, `MAX_UPLOAD_MB`, `MAX_DOCUMENT_MB`, `DATA_DIR`. Production needs HTTPS, persistent storage for `DATA_DIR`, and backups.
