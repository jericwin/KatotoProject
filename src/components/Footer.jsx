import { ArrowUp, Lock } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/katoto-logo-sm.webp'
import Mosaic from './ui/Mosaic'
import FacebookIcon from './ui/FacebookIcon'
import { NAV } from './Header'
import { org } from '../data/organization'
import { useSite, phoneHref } from '../site/SiteContext'
import { openPrivacySettings } from '../site/privacyChoices'
import './Footer.css'

export default function Footer() {
  const { contact } = useSite().content
  const home = useLocation().pathname === '/'
  const to = (id) => (home ? `#${id}` : `/#${id}`)
  return (
    <footer className="site-footer">
      <Mosaic className="site-footer__mosaic" cols={72} rows={1} seed={20210302} />
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="site-footer__seal">
            <img src={logo} alt="Katoto Project" width="420" height="252" loading="lazy" />
          </div>
          <p className="site-footer__tagline" lang="fil">
            {org.tagline}
          </p>
          <p className="site-footer__small">
            A youth organization of {org.location}. Founded {org.founded}.
          </p>
        </div>

        <nav aria-label="Footer" className="site-footer__nav">
          <h2>Explore</h2>
          <ul>
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={to(n.id)}>{n.label}</a>
              </li>
            ))}
            <li>
              <a href={to('record')}>Our record</a>
            </li>
            <li>
              <a href={to('join')}>Get involved</a>
            </li>
          </ul>
        </nav>

        <div className="site-footer__contact">
          <h2>Reach us</h2>
          <ul>
            <li>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            {contact.phoneDisplay && (
              <li>
                <a href={phoneHref(contact.phoneDisplay)}>{contact.phoneDisplay}</a>
              </li>
            )}
            <li>
              <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="site-footer__fb">
                <FacebookIcon width="18" height="18" /> Katoto Project on Facebook
                <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            </li>
            <li>{contact.address}</li>
          </ul>
        </div>
      </div>

      <nav className="container site-footer__legal" aria-label="Privacy and terms">
        <ul>
          <li>
            <Link to="/privacy-policy">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/terms-of-service">Terms of Service</Link>
          </li>
          <li>
            <Link to="/cookie-policy">Cookie Policy</Link>
          </li>
          <li>
            <Link to="/data-deletion">Privacy requests &amp; data deletion</Link>
          </li>
          <li>
            <button type="button" className="site-footer__settings" onClick={openPrivacySettings}>
              Privacy settings
            </button>
          </li>
        </ul>
      </nav>

      <div className="container site-footer__base">
        <p>© {new Date().getFullYear()} Katoto Project. Paete, Laguna.</p>
        <div className="site-footer__links">
          <Link to="/admin/login" className="site-footer__top">
            <Lock aria-hidden="true" /> Admin login
          </Link>
          <a href={home ? '#top' : '#main'} className="site-footer__top">
            Back to top <ArrowUp aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
