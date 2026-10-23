import { useEffect, useRef, useState } from 'react'
import { Mail, X, ArrowUpRight } from 'lucide-react'
import CopyButton from './CopyButton'
import { parseMailto, webmailLinks, mailtoHref } from '../../site/mail'
import './EmailChooser.css'

// "mailto:" only works when the device has an email app set up, which many
// computers and phones don't. Every mailto link on the site opens this chooser
// instead: webmail (Gmail, Outlook, Yahoo), the device's email app, or copy.
// Lets components open the chooser directly (e.g. the contact form fallback).
let openChooser = null
export const chooseEmail = (mail) => openChooser?.(mail)

export default function EmailChooser() {
  const [mail, setMail] = useState(null)
  const dialogRef = useRef(null)
  const returnFocus = useRef(null)

  useEffect(() => {
    openChooser = (m) => {
      returnFocus.current = document.activeElement
      setMail(m)
    }
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target instanceof Element && e.target.closest('a[href^="mailto:"]')
      if (!a || a.dataset.directMailto !== undefined) return
      e.preventDefault()
      returnFocus.current = a
      setMail(parseMailto(a.href))
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      openChooser = null
    }
  }, [])

  useEffect(() => {
    const d = dialogRef.current
    if (mail && d && !d.open) d.showModal()
  }, [mail])

  const close = () => dialogRef.current?.close()

  return (
    <dialog
      ref={dialogRef}
      className="email-chooser"
      aria-labelledby="email-chooser-title"
      onClose={() => {
        setMail(null)
        returnFocus.current?.focus?.()
      }}
      onClick={(e) => e.target === dialogRef.current && close()}
    >
      {mail && (
        <div className="email-chooser__body">
          <div className="email-chooser__head">
            <Mail aria-hidden="true" className="email-chooser__icon" />
            <div>
              <h2 id="email-chooser-title">Send an email</h2>
              <p>
                To <strong>{mail.to}</strong>
                {mail.subject && (
                  <>
                    <br />
                    Subject: {mail.subject}
                  </>
                )}
              </p>
            </div>
            <button type="button" className="email-chooser__close" onClick={close}>
              <X aria-hidden="true" />
              <span className="visually-hidden">Close</span>
            </button>
          </div>

          <p className="email-chooser__label">Write it in</p>
          <ul className="email-chooser__options">
            {webmailLinks(mail).map((o) => (
              <li key={o.id}>
                <a href={o.href} target="_blank" rel="noopener noreferrer" className={`email-chooser__opt email-chooser__opt--${o.id}`} onClick={close}>
                  {o.label} <ArrowUpRight aria-hidden="true" />
                  <span className="visually-hidden">(opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={mailtoHref(mail)} data-direct-mailto className="email-chooser__opt" onClick={() => setTimeout(close, 300)}>
                Email app on this device
              </a>
            </li>
          </ul>

          <div className="email-chooser__copy">
            <span>Or copy the address:</span>
            <CopyButton value={mail.to} label="Copy email address" className="btn btn-ghost email-chooser__copy-btn" />
          </div>
        </div>
      )}
    </dialog>
  )
}
