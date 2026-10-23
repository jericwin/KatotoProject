import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X, ArrowRight } from 'lucide-react'
import logo from '../assets/katoto-logo-sm.webp'
import FacebookIcon from './ui/FacebookIcon'
import { useSite } from '../site/SiteContext'
import { useLocation } from 'react-router-dom'
import './Header.css'

export const NAV = [
  { id: 'about', label: 'About' },
  { id: 'pillars', label: 'Pillars' },
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'foi', label: 'Transparency' },
  { id: 'gallery', label: 'Photos' },
  { id: 'updates', label: 'Updates' },
  { id: 'contact', label: 'Contact' },
]

function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return active
}

const NAV_IDS = ['hero', ...NAV.map((n) => n.id), 'record', 'join']

export default function Header() {
  const { contact } = useSite().content
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection(NAV_IDS)
  // On pages other than the home page, section links go back to the home page.
  const home = useLocation().pathname === '/'
  const to = (id) => (home ? `#${id}` : `/#${id}`)
  const toggleRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mobile menu: lock scroll, close on Escape, keep focus inside the panel.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panelRef.current?.querySelector('a, button')
    first?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [toggleRef.current, ...panelRef.current.querySelectorAll('a, button')]
        const idx = items.indexOf(document.activeElement)
        if (e.shiftKey && idx <= 0) {
          e.preventDefault()
          items[items.length - 1].focus()
        } else if (!e.shiftKey && idx === items.length - 1) {
          e.preventDefault()
          items[0].focus()
        }
      }
    }
    const onResize = () => window.innerWidth >= 1024 && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={`site-header ${scrolled || open ? 'is-solid' : ''}`}>
      <div className="container site-header__inner">
        <a href={home ? '#top' : '/'} className="site-header__brand" onClick={close}>
          <img src={logo} alt="Katoto Project — Kalakbay ng bawat batang Paeteño" width="420" height="252" />
        </a>

        <nav className="site-nav" aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={to(item.id)}
                  aria-current={active === item.id ? 'true' : undefined}
                  className={active === item.id ? 'is-active' : ''}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <a href={to('volunteer')} className="btn site-header__cta">
            Volunteer
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="site-header__toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            className="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile">
              <ul>
                {NAV.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i + 0.05 }}
                  >
                    <a href={to(item.id)} onClick={close} aria-current={active === item.id ? 'true' : undefined}>
                      <span className="mobile-menu__num">{String(i + 1).padStart(2, '0')}</span>
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mobile-menu__footer">
              <a href={to('volunteer')} className="btn" onClick={close}>
                Become a volunteer <ArrowRight aria-hidden="true" />
              </a>
              <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                <FacebookIcon width="18" height="18" /> Katoto on Facebook
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
