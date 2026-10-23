import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Send } from 'lucide-react'
import LegalPage, { Section } from './LegalPage'
import { useSite } from '../site/SiteContext'
import { PRIVACY_REQUEST_TYPES } from '../data/legal'
import { chooseEmail } from '../components/ui/EmailChooser'
import '../components/Contact.css'

const SECTIONS = [
  { id: 'what', title: 'What you can ask for' },
  { id: 'how', title: 'What happens next' },
  { id: 'limits', title: 'What may be kept' },
  { id: 'form', title: 'Send a request' },
]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY = { type: '', name: '', email: '', details: '', company: '' }
const NEEDS_DETAILS = ['photo', 'correction', 'other']

function RequestForm() {
  const { contact } = useSite().content
  const uid = useId()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [problem, setProblem] = useState('')
  const [reference, setReference] = useState('')
  const doneRef = useRef(null)

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }
  const field = (k) => ({
    id: `${uid}-${k}`,
    'aria-invalid': errors[k] ? 'true' : undefined,
    'aria-describedby': [errors[k] && `${uid}-${k}-err`, k === 'details' && `${uid}-details-hint`].filter(Boolean).join(' ') || undefined,
  })
  const err = (k) =>
    errors[k] && (
      <p className="field__error" id={`${uid}-${k}-err`}>
        {errors[k]}
      </p>
    )

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!values.type) found.type = 'Choose what you would like us to do.'
    if (!values.name.trim()) found.name = 'Please enter your name.'
    if (!EMAIL_RE.test(values.email.trim())) found.email = 'Enter the email address we should reply to.'
    if (NEEDS_DETAILS.includes(values.type) && !values.details.trim()) found.details = 'Please tell us what this is about.'
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) return document.getElementById(`${uid}-${first}`)?.focus()
    setStatus('sending')
    try {
      const res = await fetch('/api/public/privacy-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(values),
      })
      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {}
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(data.error || 'The request could not be sent.')
      }
      setReference(data.reference || '')
      setStatus('sent')
      setValues(EMPTY)
      setTimeout(() => doneRef.current?.focus(), 0)
    } catch (error) {
      setProblem(error.message === 'Failed to fetch' ? 'The website couldn’t be reached.' : error.message)
      setStatus('error')
    }
  }

  if (status === 'sent')
    return (
      <div className="contact-form contact-form--sent" role="status" tabIndex={-1} ref={doneRef}>
        <CheckCircle2 aria-hidden="true" className="contact-form__ok" />
        <h3>Request received{reference && ` (${reference})`}</h3>
        <p>
          Your request has been recorded. Katoto will email you at the address you gave to confirm it came from you. Please
          reply from that same address. Nothing is deleted or changed until then.
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus('idle')}>
          Send another request
        </button>
      </div>
    )

  const typeLabel = PRIVACY_REQUEST_TYPES.find((t) => t.id === values.type)?.label

  return (
    <form className="contact-form" onSubmit={submit} noValidate aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`}>Privacy request</h3>
      <p className="contact-form__note">
        <span>
          We use these details only to confirm and handle your request, and keep a short record that it was handled (see the{' '}
          <Link to="/privacy-policy#retention">Privacy Policy</Link>). We will never ask you for an ID or a password by
          email.
        </span>
      </p>

      <div className="field">
        <label htmlFor={`${uid}-type`}>What would you like us to do?</label>
        <select value={values.type} onChange={set('type')} {...field('type')}>
          <option value="">Choose…</option>
          {PRIVACY_REQUEST_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {err('type')}
      </div>
      <div className="contact-form__row">
        <div className="field">
          <label htmlFor={`${uid}-name`}>Your name</label>
          <input type="text" autoComplete="name" maxLength={100} value={values.name} onChange={set('name')} {...field('name')} />
          {err('name')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-email`}>Email address</label>
          <input type="email" autoComplete="email" inputMode="email" maxLength={200} value={values.email} onChange={set('email')} {...field('email')} />
          {err('email')}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${uid}-details`}>
          Details {NEEDS_DETAILS.includes(values.type) ? '' : '(optional)'}
        </label>
        <p className="field__hint" id={`${uid}-details-hint`}>
          For example: the email address you used on the contact form, which photo (album name and caption), or what
          should be corrected. Please don’t include identity documents.
        </p>
        <textarea rows={4} maxLength={3000} value={values.details} onChange={set('details')} {...field('details')} />
        {err('details')}
      </div>
      <div className="contact-form__hp" aria-hidden="true">
        <label htmlFor={`${uid}-company`}>Company</label>
        <input id={`${uid}-company`} tabIndex={-1} autoComplete="off" value={values.company} onChange={set('company')} />
      </div>
      <button type="submit" className="btn" disabled={status === 'sending'}>
        <Send aria-hidden="true" /> {status === 'sending' ? 'Sending…' : 'Send request'}
      </button>
      <div className="contact-form__status" role="alert">
        {status === 'error' && (
          <>
            <p>{problem} You can send the request by email instead.</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                chooseEmail({
                  to: contact.email,
                  subject: `Privacy request: ${typeLabel || 'request'}`,
                  body: `${values.details}\n\n—\n${values.name}\n${values.email}`,
                })
              }
            >
              Send it by email
            </button>
          </>
        )}
      </div>
    </form>
  )
}

export default function DataRequests() {
  const { contact } = useSite().content
  return (
    <LegalPage
      title="Privacy requests & data deletion"
      sections={SECTIONS}
      intro={
        <p>
          Ask Katoto Project to delete, show, or correct personal information collected through this website, or to remove
          a photo of you or your child.
        </p>
      }
    >
      <Section id="what" title="What you can ask for">
        <ul>
          <li><strong>Delete</strong> contact-form messages you sent, and earlier privacy requests.</li>
          <li><strong>Get a copy</strong> of the messages and requests linked to your email address.</li>
          <li><strong>Correct</strong> wrong information, including your name as shown among Katoto’s officers.</li>
          <li><strong>Remove a photo</strong> of you, or of your child if you are their parent or guardian.</li>
          <li>
            Visit statistics can’t be linked to you, because no name, email, or IP address is stored, so they can’t be
            found or deleted per person. You can turn them off in Privacy settings at any time.
          </li>
        </ul>
      </Section>

      <Section id="how" title="What happens next">
        <ol>
          <li>Your request is recorded, and you see a reference number.</li>
          <li>
            To make sure the request really comes from you, Katoto emails you from {contact.email}. Reply from the same email
            address. Katoto won’t ask for an ID unless there is no other way to confirm a request, for example for a photo.
          </li>
          <li>Katoto checks whether anything must legally be kept, then deletes, sends, or corrects the information.</li>
          <li>Katoto emails you to say what was done, or why something could not be done.</li>
        </ol>
        <p>
          You can also email {contact.email} directly. Katoto will reply as soon as it can.
        </p>
      </Section>

      <Section id="limits" title="What may be kept">
        <ul>
          <li>A short record that your request was handled (type, name, email, dates, and what was done). The details you wrote are erased when the request is closed.</li>
          <li>Information Katoto must keep by law, for example financial records. Katoto will tell you if this applies.</li>
          <li>
            Copies of messages already emailed to Katoto’s inbox are deleted by hand as part of your request. Backups are
            replaced over time, so deleted information can remain in a backup until then.
          </li>
        </ul>
      </Section>

      <Section id="form" title="Send a request">
        <RequestForm />
      </Section>
    </LegalPage>
  )
}
