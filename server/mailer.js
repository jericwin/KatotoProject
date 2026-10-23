import nodemailer from 'nodemailer'
import { config } from './config.js'

const { smtp } = config
export const mailEnabled = () => !!(smtp.host && smtp.from)

let transport = null
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  return transport
}

// Strip line breaks so visitor input can never add mail headers.
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').slice(0, 200)

// Sends a plain-text notification about a contact-form message. Reply-To is
// the visitor, so replying from the inbox answers them directly.
export async function notifyNewMessage(msg, to) {
  if (!mailEnabled() || !to) return false
  await getTransport().sendMail({
    from: { name: 'Katoto Project website', address: smtp.from },
    to,
    replyTo: { name: oneLine(msg.name), address: msg.email },
    subject: oneLine(`[Website] ${msg.topic} from ${msg.name}`),
    text: `${msg.message}\n\n—\nFrom: ${msg.name} <${msg.email}>\nTopic: ${msg.topic}\n\nSent through the contact form on the Katoto Project website. Reply to this email to answer them.`,
  })
  return true
}

// Alerts Katoto that a privacy request arrived. Personal details stay in the
// admin; the email only says that a request is waiting.
export async function notifyPrivacyRequest(request, to) {
  if (!mailEnabled() || !to) return false
  await getTransport().sendMail({
    from: { name: 'Katoto Project website', address: smtp.from },
    to,
    subject: oneLine(`[Website] Privacy request: ${request.label}`),
    text: `A privacy request (${request.label}) was submitted through the website.\n\nReference: PR-${String(request.id).padStart(4, '0')}\n\nOpen Admin → Privacy requests to verify the requester and handle it. Do not delete anything before the requester’s identity is confirmed.`,
  })
  return true
}

// Security emails (lockout alerts, recovery links, change verifications and
// confirmations). Plain text, no tracking. Throws if the server rejects it.
export async function sendSecurityEmail({ to, subject, text }) {
  if (!mailEnabled()) throw Object.assign(new Error('Email is not configured.'), { code: 'NOT_CONFIGURED' })
  await getTransport().sendMail({
    from: { name: 'Katoto Project website', address: smtp.from },
    to,
    subject: oneLine(subject),
    text,
  })
}
