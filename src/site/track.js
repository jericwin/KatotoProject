import { useEffect } from 'react'
import { statisticsAllowed } from './privacyChoices'

// Anonymous visit statistics (see server/stats.js): no cookies, nothing kept
// in the browser. Sent only when the visitor has allowed statistics; signed-in
// admins and previews are not counted.
export function track(type) {
  if (!statisticsAllowed()) return
  try {
    fetch('/api/public/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, referrer: type === 'view' ? document.referrer : '' }),
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* statistics must never break the page */
  }
}

function classify(a) {
  if (a.dataset.track) return a.dataset.track
  const href = a.getAttribute('href') || ''
  if (href.startsWith('mailto:')) return 'email'
  if (href.startsWith('tel:')) return 'phone'
  if (/^https?:\/\/([a-z]+\.)?facebook\.com\//i.test(href)) return 'facebook'
  return null
}

let viewSent = false // once per page load (React StrictMode runs effects twice)

export function useVisitTracking({ enabled }) {
  useEffect(() => {
    if (!enabled) return
    if (!viewSent) {
      viewSent = true
      track('view')
    }
    const onClick = (e) => {
      const a = e.target instanceof Element && e.target.closest('a[href]')
      // Choices inside the email chooser were already counted on the first click.
      const type = a && !a.closest('.email-chooser') && classify(a)
      if (type) track(type)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled])
}
