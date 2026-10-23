import { createContext, useContext, useEffect, useState } from 'react'
import { defaultContent, defaultNews } from '../data/siteDefaults'
import { galleryItems } from '../data/gallery'

// Bundled fallback so the public site renders fully even when the API is
// unreachable (or the site is deployed as static files only).
const fallbackAlbums = [
  {
    id: 'fallback-pillars',
    title: 'The six pillars in action',
    description: 'One snapshot from each of Katoto’s six pillars, from the organization’s “6 Pillars” graphic.',
    kinds: ['photo'],
  },
  {
    id: 'fallback-docs',
    title: 'Recognition & documents',
    description: 'Katoto’s provincial accreditation and its own “6 Pillars” graphic.',
    kinds: ['document'],
  },
].map(({ kinds, ...a }) => {
  const photos = galleryItems
    .filter((g) => kinds.includes(g.kind))
    .map((g) => ({ id: g.id, src: g.src, thumb: g.thumb, caption: g.kind === 'photo' ? `${g.title}: ${g.caption}` : g.caption, alt: g.alt }))
  return { ...a, published: true, cover: photos[0], photos }
})

const fallback = {
  status: 'fallback',
  preview: false,
  content: defaultContent,
  news: defaultNews.map((n, i) => ({ ...n, id: `n${i}`, published: true })),
  albums: fallbackAlbums,
  foi: [],
  // Defaults match the server's default settings (server/config.js).
  privacy: { messageRetentionDays: 365, privacyRequestRetentionDays: 365, visitStatsRetentionDays: 400, emailAlerts: false },
}

const SiteContext = createContext(fallback)

export function SiteProvider({ children }) {
  const [state, setState] = useState({ ...fallback, status: 'loading' })

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1'
    const ctrl = new AbortController()
    fetch(`/api/public/site${preview ? '?preview=1' : ''}`, { signal: ctrl.signal, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) =>
        setState({
          status: 'ready',
          preview: data.preview,
          // Merge over defaults so a missing section never blanks the page.
          content: { ...defaultContent, ...data.content },
          news: data.news,
          albums: data.albums,
          foi: data.foi || [],
          privacy: data.privacy || fallback.privacy,
        }),
      )
      .catch((err) => {
        if (err.name !== 'AbortError') setState(fallback)
      })
    return () => ctrl.abort()
  }, [])

  return <SiteContext.Provider value={state}>{children}</SiteContext.Provider>
}

export const useSite = () => useContext(SiteContext)

// "0992 619 2807" → "tel:+639926192807"
export function phoneHref(display) {
  const digits = String(display || '').replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return `tel:${digits}`
  if (digits.startsWith('0')) return `tel:+63${digits.slice(1)}`
  return `tel:${digits}`
}
