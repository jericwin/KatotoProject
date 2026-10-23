// Building email links: mailto plus webmail compose URLs for the same message.
export function parseMailto(href) {
  const url = new URL(href)
  return {
    to: decodeURIComponent(url.pathname),
    subject: url.searchParams.get('subject') || '',
    body: url.searchParams.get('body') || '',
  }
}

const enc = encodeURIComponent
export function webmailLinks({ to, subject, body }) {
  return [
    { id: 'gmail', label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}` },
    { id: 'outlook', label: 'Outlook', href: `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}` },
    { id: 'yahoo', label: 'Yahoo Mail', href: `https://compose.mail.yahoo.com/?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}` },
  ]
}

export function mailtoHref({ to, subject, body }) {
  const params = [subject && `subject=${enc(subject)}`, body && `body=${enc(body)}`].filter(Boolean).join('&')
  return `mailto:${to}${params ? `?${params}` : ''}`
}
