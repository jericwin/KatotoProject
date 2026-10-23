import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, ShieldCheck, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../api'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast, useConfirm } from '../ui'
import { webmailLinks, mailtoHref } from '../../site/mail'
import CopyButton from '../../components/ui/CopyButton'

const sqlDate = (s) => new Date(`${s.replace(' ', 'T')}Z`)
const fmt = (s) => (s ? sqlDate(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')
const STATUS = {
  new: { label: 'New', tone: 'warn' },
  verifying: { label: 'Verifying', tone: 'warn' },
  completed: { label: 'Completed', tone: 'live' },
  declined: { label: 'Declined', tone: '' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status }
  return <span className={`a-badge ${s.tone === 'live' ? 'a-badge--live' : s.tone === 'warn' ? 'a-badge--warn' : ''}`}>{s.label}</span>
}

// Email templates for the officer to send from Katoto's own inbox.
function verifyMail(r) {
  return {
    to: r.email,
    subject: `Your privacy request ${r.reference} (Katoto Project)`,
    body: `Hi ${r.name},\n\nKatoto Project received a privacy request (${r.label}) from this email address on ${fmt(r.createdAt)}, reference ${r.reference}.\n\nTo confirm that the request came from you, please reply to this email from this address. If you did not make this request, you can ignore this email.\n\n—\nKatoto Project`,
  }
}
function outcomeMail(r) {
  return {
    to: r.email,
    subject: `Your privacy request ${r.reference} is complete (Katoto Project)`,
    body: `Hi ${r.name},\n\nThis is about your privacy request (${r.label}), reference ${r.reference}.\n\nWhat we did: \n\n—\nKatoto Project`,
  }
}
function accessText(r, matches) {
  const lines = [`Information linked to ${r.email} on the Katoto Project website (${new Date().toLocaleDateString()}):`, '']
  if (!matches.messages.length) lines.push('Contact messages: none.')
  for (const m of matches.messages)
    lines.push(`Contact message, ${fmt(m.createdAt)}`, `Name: ${m.name}`, `Email: ${m.email}`, `Topic: ${m.topic}`, `Consent: ${m.consentVersion || 'not recorded'}${m.consentedAt ? `, ${fmt(m.consentedAt)}` : ''}`, `Message: ${m.message}`, '')
  lines.push(`Privacy requests: ${matches.otherRequests.length + 1} (including this one).`)
  lines.push('Visit statistics cannot be linked to a person, so none are included.')
  return lines.join('\n')
}

function MailButtons({ mail }) {
  const [gmail, outlook] = webmailLinks(mail)
  return (
    <>
      <a className="a-btn a-btn--sm" href={gmail.href} target="_blank" rel="noopener noreferrer">
        <Mail aria-hidden="true" /> Gmail
        <span className="visually-hidden">(opens in a new tab)</span>
      </a>
      <a className="a-btn a-btn--ghost a-btn--sm" href={outlook.href} target="_blank" rel="noopener noreferrer">
        Outlook<span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      <a className="a-btn a-btn--ghost a-btn--sm" href={mailtoHref(mail)}>
        Email app
      </a>
    </>
  )
}

function RequestDetail({ id }) {
  const { status, data, error, reload, setData } = useAsync(() => api(`/admin/privacy-requests/${id}`), [id])
  const [resolution, setResolution] = useState('')
  const [resolutionError, setResolutionError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()

  if (status === 'loading') return <Loading />
  if (status === 'error') return <ErrorState error={error} onRetry={reload} />
  const { request: r, matches } = data
  const open = r.status === 'new' || r.status === 'verifying'

  const act = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      if (msg) toast(msg)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }
  const close = (next) => {
    if (!resolution.trim()) {
      setResolutionError('Write what was done (or why not), for the record.')
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    act(async () => {
      await api(`/admin/privacy-requests/${r.id}/status`, { method: 'POST', body: { status: next, resolution } })
      await reload()
    }, next === 'completed' ? 'Request completed.' : 'Request declined.')
  }

  return (
    <>
      <Link to="/admin/dashboard/privacy" className="a-back">
        <ArrowLeft aria-hidden="true" /> All privacy requests
      </Link>
      <PageHeader title={`${r.reference}: ${r.label}`} description={`Received ${fmt(r.createdAt)}`}>
        <StatusBadge status={r.status} />
      </PageHeader>

      <div className="a-card a-form">
        <h2 className="a-h2">Request</h2>
        <dl className="a-pr-facts">
          <div>
            <dt>Name</dt>
            <dd>{r.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              {r.email} <CopyButton value={r.email} label="Copy" className="a-btn a-btn--ghost a-btn--sm" />
            </dd>
          </div>
          <div>
            <dt>Details</dt>
            <dd className="a-pr-details">{r.details || (open ? '(none given)' : '(erased when the request was closed)')}</dd>
          </div>
          {!open && (
            <div>
              <dt>Outcome</dt>
              <dd>{r.resolution}</dd>
            </div>
          )}
        </dl>
      </div>

      {open && (
        <>
          <section className="a-card a-form" aria-labelledby="pr-step1">
            <h2 className="a-h2" id="pr-step1">
              1. Confirm it’s really them
            </h2>
            {r.verifiedAt ? (
              <p className="admin-alert admin-alert--info">
                <ShieldCheck aria-hidden="true" /> Identity verified {fmt(r.verifiedAt)}.
              </p>
            ) : (
              <>
                <p className="a-muted">
                  Email the requester from Katoto’s official address and ask them to reply from {r.email}. Don’t ask for an
                  ID unless there’s no other way (for example, a photo request from someone who never emailed Katoto).
                </p>
                <div className="a-msg__actions">
                  <MailButtons mail={verifyMail(r)} />
                  {r.status === 'new' && (
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--sm"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await api(`/admin/privacy-requests/${r.id}/status`, { method: 'POST', body: { status: 'verifying' } })
                          await reload()
                        }, 'Marked as verifying.')
                      }
                    >
                      I sent the verification email
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="a-btn"
                  disabled={busy}
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Mark identity as verified?',
                      message: `Only do this after ${r.email} replied to your email, or you otherwise confirmed the request is genuine.`,
                      confirmLabel: 'Yes, verified',
                      tone: 'primary',
                    })
                    if (ok) act(async () => setData(await api(`/admin/privacy-requests/${r.id}/verify`, { method: 'POST' })), 'Identity verified.')
                  }}
                >
                  <ShieldCheck aria-hidden="true" /> They replied: mark as verified
                </button>
              </>
            )}
          </section>

          <section className="a-card a-form" aria-labelledby="pr-step2">
            <h2 className="a-h2" id="pr-step2">
              2. Find and handle their information
            </h2>
            <p>
              <strong>{matches.messages.length}</strong> contact message{matches.messages.length === 1 ? '' : 's'} and{' '}
              <strong>{matches.otherRequests.length}</strong> other privacy request{matches.otherRequests.length === 1 ? '' : 's'} use{' '}
              {r.email}.
            </p>
            {matches.messages.length > 0 && (
              <ul className="a-pr-matches">
                {matches.messages.map((m) => (
                  <li key={m.id}>
                    <strong>{fmt(m.createdAt)}</strong> · {m.topic}: {m.message.slice(0, 140)}
                    {m.message.length > 140 ? '…' : ''}
                  </li>
                ))}
              </ul>
            )}
            <ul className="a-muted a-pr-checklist">
              <li>Also check Katoto’s email inbox ({r.email}) and delete the matching emails there by hand.</li>
              <li>Photos and officer names: find them under Photo albums or Officers &amp; committees and edit or delete them.</li>
              <li>Visit statistics can’t be linked to a person, so there is nothing to delete there.</li>
              <li>Before deleting, check whether Katoto must keep anything by law (for example financial records).</li>
            </ul>
            <div className="a-msg__actions">
              {r.type === 'access' && (
                <CopyButton value={accessText(r, matches)} label="Copy their data as text" className="a-btn a-btn--ghost a-btn--sm" />
              )}
              <button
                type="button"
                className="a-btn a-btn--danger a-btn--sm"
                disabled={busy || !r.verifiedAt || matches.messages.length === 0}
                title={!r.verifiedAt ? 'Verify their identity first' : undefined}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete ${matches.messages.length} contact message${matches.messages.length === 1 ? '' : 's'}?`,
                    message: `All contact messages from ${r.email} will be permanently deleted from the website. This can’t be undone.`,
                    confirmLabel: 'Delete messages',
                  })
                  if (ok)
                    act(async () => {
                      const res = await api(`/admin/privacy-requests/${r.id}/delete-messages`, { method: 'POST' })
                      setData({ request: res.request, matches: res.matches })
                    }, 'Messages deleted.')
                }}
              >
                <Trash2 aria-hidden="true" /> Delete their contact messages
              </button>
            </div>
            {!r.verifiedAt && <p className="a-muted">Deleting is available after the identity is verified.</p>}
          </section>

          <section className="a-card a-form" aria-labelledby="pr-step3">
            <h2 className="a-h2" id="pr-step3">
              3. Tell them and close the request
            </h2>
            <div className="a-msg__actions">
              <MailButtons mail={outcomeMail(r)} />
            </div>
            <Field
              label="What was done"
              hint="Kept as the record of this request, e.g. “Deleted 2 contact messages and the matching emails in Gmail; replied on Oct 25.” Don’t copy personal details here. The request’s details are erased when you close it."
              multiline
              rows={3}
              value={resolution}
              onChange={(v) => {
                setResolution(v)
                setResolutionError('')
              }}
              error={resolutionError}
              maxLength={1000}
            />
            <div className="a-form__actions">
              <button type="button" className="a-btn a-btn--ghost" disabled={busy} onClick={() => close('declined')}>
                <XCircle aria-hidden="true" /> Decline
              </button>
              <button type="button" className="a-btn" disabled={busy || !r.verifiedAt} onClick={() => close('completed')}>
                <CheckCircle2 aria-hidden="true" /> Mark completed
              </button>
            </div>
            {!r.verifiedAt && <p className="a-muted">A request can be completed only after the identity is verified. You can decline it at any time, with a reason.</p>}
          </section>
        </>
      )}

      <section className="a-card" aria-labelledby="pr-log">
        <h2 className="a-h2" id="pr-log">
          History
        </h2>
        <ol className="a-pr-log">
          {r.log.map((l, i) => (
            <li key={i}>
              <time>{new Date(l.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
              <span>
                {l.event}
                {l.by && <span className="a-muted"> · {l.by}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

function RequestList() {
  const { status, data, error, reload } = useAsync(() => api('/admin/privacy-requests'), [])
  return (
    <>
      <PageHeader
        title="Privacy requests"
        description="Requests to delete, show, or correct personal information, sent from the website’s Privacy requests page."
      />
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <p className="admin-alert admin-alert--info">
            <ShieldCheck aria-hidden="true" />
            Nothing is deleted automatically when a request arrives: confirm the requester’s identity first. Closed requests
            keep only a short record and are deleted {data.retentionDays} days after closing.
          </p>
          {data.requests.length === 0 ? (
            <p className="a-empty">No privacy requests.</p>
          ) : (
            <ul className="a-msgs">
              {data.requests.map((r) => (
                <li key={r.id} className={`a-msg ${r.status === 'new' ? 'is-unread' : ''}`}>
                  <Link to={`/admin/dashboard/privacy/${r.id}`} className="a-msg__summary">
                    <span className="a-msg__from">
                      <strong>{r.reference}</strong> {r.label} <StatusBadge status={r.status} />
                    </span>
                    <time className="a-msg__date">{fmt(r.createdAt)}</time>
                    <span className="a-msg__preview">
                      {r.name} · {r.email}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}

export default function PrivacyRequestsPage() {
  const { id } = useParams()
  return id ? <RequestDetail id={id} /> : <RequestList />
}

