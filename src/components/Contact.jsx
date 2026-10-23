import { useId, useRef, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Info, Mail, MapPin, Phone, Send } from 'lucide-react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import FacebookIcon from './ui/FacebookIcon'
import { useSite, phoneHref } from '../site/SiteContext'
import { chooseEmail } from './ui/EmailChooser'
import { CONTACT_TOPICS } from '../data/siteDefaults'
import { CONTACT_CONSENT_TEXT } from '../data/legal'
import { Link } from 'react-router-dom'
import './Contact.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY = { name: '', email: '', topic: CONTACT_TOPICS[0], message: '', company: '', consent: false }

function validate(v) {
  const e = {}
  if (!v.name.trim()) e.name = 'Please enter your name.'
  if (!v.email.trim()) e.email = 'Please enter your email address.'
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'That email address doesn’t look right.'
  if (v.message.trim().length < 10) e.message = 'Please write a message of at least 10 characters.'
  if (!v.consent) e.consent = 'Please confirm that Katoto may use your details to reply.'
  return e
}

// Sends the message to the site's server, where admins read it under
// Admin → Messages (and get an email alert if SMTP is configured). If the
// server can't be reached, the visitor can send the same text by email.
function ContactForm() {
  const { contact } = useSite().content
  const uid = useId()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [problem, setProblem] = useState('')
  const statusRef = useRef(null)

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const asEmail = () => ({
    to: contact.email,
    subject: `[Website] ${values.topic} from ${values.name.trim()}`,
    body: `${values.message.trim()}\n\n—\n${values.name.trim()}\n${values.email.trim()}`,
  })

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstBad = Object.keys(found)[0]
    if (firstBad) {
      document.getElementById(`${uid}-${firstBad}`)?.focus()
      return
    }
    setStatus('sending')
    setProblem('')
    try {
      const res = await fetch('/api/public/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(values),
      })
      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {}
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(data.error || 'The message could not be sent.')
      }
      setStatus('sent')
      setValues(EMPTY)
      setTimeout(() => statusRef.current?.focus(), 0)
    } catch (err) {
      setProblem(err.message === 'Failed to fetch' ? 'The website couldn’t be reached.' : err.message)
      setStatus('error')
    }
  }

  const field = (k) => ({
    id: `${uid}-${k}`,
    'aria-invalid': errors[k] ? 'true' : undefined,
    'aria-describedby': errors[k] ? `${uid}-${k}-err` : undefined,
  })

  if (status === 'sent')
    return (
      <div className="contact-form contact-form--sent" role="status" tabIndex={-1} ref={statusRef}>
        <CheckCircle2 aria-hidden="true" className="contact-form__ok" />
        <h3>Message sent. Salamat!</h3>
        <p>
          Katoto Project received your message and will reply to the email address you gave. For anything urgent, message
          Katoto on Facebook.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus('idle')}>
          Send another message
        </button>
      </div>
    )

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`}>Write to Katoto</h3>
      <p className="contact-form__note">
        <Info aria-hidden="true" />
        <span>
          Your message goes to Katoto Project’s officers, who use your name and email address only to reply. Messages are
          deleted automatically after a year. If you are under 18, please ask a parent or guardian to read the{' '}
          <Link to="/privacy-policy">Privacy Policy</Link> with you first.
        </span>
      </p>

      <div className="contact-form__row">
        <div className="field">
          <label htmlFor={`${uid}-name`}>Your name</label>
          <input type="text" autoComplete="name" maxLength={100} value={values.name} onChange={set('name')} {...field('name')} />
          {errors.name && (
            <p className="field__error" id={`${uid}-name-err`}>
              {errors.name}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-email`}>Your email</label>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={200}
            value={values.email}
            onChange={set('email')}
            {...field('email')}
          />
          {errors.email && (
            <p className="field__error" id={`${uid}-email-err`}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-topic`}>Topic</label>
        <select value={values.topic} onChange={set('topic')} {...field('topic')}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${uid}-message`}>Message</label>
        <textarea rows={5} maxLength={5000} value={values.message} onChange={set('message')} {...field('message')} />
        {errors.message && (
          <p className="field__error" id={`${uid}-message-err`}>
            {errors.message}
          </p>
        )}
      </div>

      <div className="field field--check">
        <label className="contact-form__consent" htmlFor={`${uid}-consent`}>
          <input type="checkbox" checked={values.consent} onChange={set('consent')} {...field('consent')} />
          <span>
            {CONTACT_CONSENT_TEXT.replace(' as explained in the Privacy Policy.', '')} as explained in the{' '}
            <Link to="/privacy-policy">Privacy Policy</Link>.
          </span>
        </label>
        {errors.consent && (
          <p className="field__error" id={`${uid}-consent-err`}>
            {errors.consent}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from people, filled in by spam bots. */}
      <div className="contact-form__hp" aria-hidden="true">
        <label htmlFor={`${uid}-company`}>Company</label>
        <input id={`${uid}-company`} tabIndex={-1} autoComplete="off" value={values.company} onChange={set('company')} />
      </div>

      <button type="submit" className="btn" disabled={status === 'sending'}>
        <Send aria-hidden="true" /> {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      <div className="contact-form__status" role="alert">
        {status === 'error' && (
          <>
            <p>
              {problem} You can send the same message by email instead; your text is kept.
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => chooseEmail(asEmail())}>
              <Mail aria-hidden="true" /> Send it by email
            </button>
          </>
        )}
      </div>
    </form>
  )
}

export default function Contact() {
  const { contact } = useSite().content
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <SectionHeader num="09" label="Contact" id="contact-title" title="Usap tayo. Let’s talk.">
          <p>Questions about joining, supporting, or inviting Katoto? Reach the organization through its official channels.</p>
        </SectionHeader>

        <div className="contact__grid">
          <Reveal as="ul" className="contact__channels">
            <li>
              <Mail aria-hidden="true" />
              <div>
                <span className="contact__label">Email</span>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            </li>
            {contact.phoneDisplay && (
              <li>
                <Phone aria-hidden="true" />
                <div>
                  <span className="contact__label">Call or text</span>
                  <a href={phoneHref(contact.phoneDisplay)}>{contact.phoneDisplay}</a>
                </div>
              </li>
            )}
            <li>
              <FacebookIcon />
              <div>
                <span className="contact__label">Facebook</span>
                <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer">
                  {contact.facebookUrl.replace(/^https:\/\/(www\.|m\.)?facebook\.com\//i, '').replace(/\/$/, '') || 'Facebook'}{' '}
                  <ArrowUpRight aria-hidden="true" className="contact__ext" />
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              </div>
            </li>
            <li>
              <MapPin aria-hidden="true" />
              <div>
                <span className="contact__label">Based in</span>
                <span>{contact.address}</span>
              </div>
            </li>
          </Reveal>

          <Reveal delay={0.08}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
