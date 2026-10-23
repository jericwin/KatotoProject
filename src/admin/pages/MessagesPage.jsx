import { useContext, useState } from 'react'
import { Mail, MailOpen, Trash2, Reply, ExternalLink, BellOff, Bell } from 'lucide-react'
import { api } from '../api'
import { MessagesContext } from '../Layout'
import { PageHeader, Loading, ErrorState, useAsync, useToast, useConfirm } from '../ui'
import { mailtoHref, webmailLinks } from '../../site/mail'
import CopyButton from '../../components/ui/CopyButton'

const sqlDate = (s) => new Date(`${s.replace(' ', 'T')}Z`)
const fmt = (s) => sqlDate(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function replyMail(m) {
  const quoted = m.message
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  return {
    to: m.email,
    subject: `Re: ${m.topic} (Katoto Project)`,
    body: `Hi ${m.name},\n\n\n\n—\nKatoto Project\n\nOn ${fmt(m.createdAt)}, ${m.name} wrote:\n${quoted}`,
  }
}

export default function MessagesPage() {
  const { status, data, error, reload, setData } = useAsync(() => api('/admin/messages'), [])
  const [openId, setOpenId] = useState(null)
  const unread = useContext(MessagesContext)
  const toast = useToast()
  const confirm = useConfirm()

  const run = async (path, opts, msg) => {
    try {
      setData(await api(path, opts))
      unread.refresh()
      if (msg) toast(msg)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const toggle = (m) => {
    const opening = openId !== m.id
    setOpenId(opening ? m.id : null)
    if (opening && !m.read) run(`/admin/messages/${m.id}/read`, { method: 'POST', body: { read: true } })
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages sent through the contact form on the website, newest first. Reply from your own email."
      />
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          {data.emailNotifications ? (
            <p className="admin-alert admin-alert--info">
              <Bell aria-hidden="true" /> Email alerts are on: each new message is also emailed to Katoto’s inbox.
            </p>
          ) : (
            <p className="admin-alert admin-alert--info">
              <BellOff aria-hidden="true" /> Email alerts are off, so check this page for new messages. To also get them by
              email, set the SMTP settings in the server’s .env file (see README).
            </p>
          )}

          {(data?.messages || []).length === 0 ? (
            <p className="a-empty">No messages yet. They appear here when someone uses the form in the website’s Contact section.</p>
          ) : (
            <ul className="a-msgs">
              {(data?.messages || []).map((m) => {
                const open = openId === m.id
                const reply = replyMail(m)
                return (
                  <li key={m.id} className={`a-msg ${m.read ? '' : 'is-unread'}`}>
                    <button type="button" className="a-msg__summary" aria-expanded={open} onClick={() => toggle(m)}>
                      <span className="a-msg__from">
                        <strong>{m.name}</strong>
                        <span className="a-badge">{m.topic}</span>
                        {!m.read && <span className="visually-hidden">(unread)</span>}
                      </span>
                      <time className="a-msg__date" dateTime={sqlDate(m.createdAt).toISOString()}>
                        {fmt(m.createdAt)}
                      </time>
                      {!open && <span className="a-msg__preview">{m.message}</span>}
                    </button>
                    {open && (
                      <div className="a-msg__body">
                        <p className="a-msg__meta">
                          From <strong>{m.name}</strong> &lt;{m.email}&gt;
                          {m.notified && ' · also emailed to Katoto'}
                        </p>
                        <p className="a-msg__text">{m.message}</p>
                        <div className="a-msg__actions">
                          <a className="a-btn a-btn--sm" href={webmailLinks(reply)[0].href} target="_blank" rel="noopener noreferrer">
                            <Reply aria-hidden="true" /> Reply in Gmail
                            <span className="visually-hidden">(opens in a new tab)</span>
                          </a>
                          <a className="a-btn a-btn--ghost a-btn--sm" href={webmailLinks(reply)[1].href} target="_blank" rel="noopener noreferrer">
                            <ExternalLink aria-hidden="true" /> Reply in Outlook
                            <span className="visually-hidden">(opens in a new tab)</span>
                          </a>
                          <a className="a-btn a-btn--ghost a-btn--sm" href={mailtoHref(reply)}>
                            <Mail aria-hidden="true" /> Email app
                          </a>
                          <CopyButton value={m.email} label="Copy address" className="a-btn a-btn--ghost a-btn--sm" />
                          <button
                            type="button"
                            className="a-btn a-btn--ghost a-btn--sm"
                            onClick={() => {
                              setOpenId(null)
                              run(`/admin/messages/${m.id}/read`, { method: 'POST', body: { read: false } }, 'Marked as unread.')
                            }}
                          >
                            <MailOpen aria-hidden="true" /> Mark unread
                          </button>
                          <button
                            type="button"
                            className="a-btn a-btn--danger a-btn--sm"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Delete this message?',
                                message: `The message from ${m.name} will be permanently deleted.`,
                                confirmLabel: 'Delete message',
                              })
                              if (ok) run(`/admin/messages/${m.id}`, { method: 'DELETE' }, 'Message deleted.')
                            }}
                          >
                            <Trash2 aria-hidden="true" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </>
  )
}
