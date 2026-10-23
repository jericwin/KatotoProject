import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { SiteProvider, useSite } from './site/SiteContext'
import { useVisitTracking } from './site/track'
import { usePrivacyChoices } from './site/privacyChoices'
import Header from './components/Header'
import Hero from './components/Hero'
import FactStrip from './components/FactStrip'
import About from './components/About'
import Pillars from './components/Pillars'
import Volunteer from './components/Volunteer'
import Record from './components/Record'
import Transparency from './components/Transparency'
import Gallery from './components/Gallery'
import GetInvolved from './components/GetInvolved'
import Updates from './components/Updates'
import Contact from './components/Contact'
import Footer from './components/Footer'
import EmailChooser from './components/ui/EmailChooser'
import PrivacyChoices from './components/PrivacyChoices'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import CookiePolicy from './pages/CookiePolicy'
import DataRequests from './pages/DataRequests'
import NotFound from './pages/NotFound'

const PAGES = {
  '/privacy-policy': PrivacyPolicy,
  '/terms-of-service': TermsOfService,
  '/cookie-policy': CookiePolicy,
  '/data-deletion': DataRequests,
}

function VisitTracking() {
  const { status } = useSite()
  const choices = usePrivacyChoices()
  // Only with the visitor's permission, after the site data has loaded, and
  // never for admin previews.
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1'
  useVisitTracking({ enabled: status !== 'loading' && !isPreview && choices?.statistics === true })
  return null
}

function PreviewBanner() {
  const { preview } = useSite()
  if (!preview) return null
  return (
    <div className="preview-banner" role="status">
      <strong>Preview</strong> You’re seeing unpublished changes. Visitors still see the published site.
      <a href="/admin/dashboard">Back to dashboard</a>
    </div>
  )
}

function Home() {
  // Links like /#volunteer arrive before React has drawn the sections, so the
  // browser can't jump to them on its own. Scroll once the page is rendered.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <>
      <Hero />
      <FactStrip />
      <About />
      <Pillars />
      <Volunteer />
      <Record />
      <Transparency />
      <Gallery />
      <GetInvolved />
      <Updates />
      <Contact />
    </>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  const Page = path === '/' ? Home : PAGES[path] || NotFound

  // Other pages start at the top (the home page keeps #section links working).
  useEffect(() => {
    if (path !== '/') window.scrollTo(0, 0)
  }, [path])

  return (
    <SiteProvider>
      <MotionConfig reducedMotion="user">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div id="top" />
        <VisitTracking />
        <PreviewBanner />
        <Header />
        <main id="main" tabIndex={-1}>
          <Page />
        </main>
        <Footer />
        <EmailChooser />
        <PrivacyChoices />
      </MotionConfig>
    </SiteProvider>
  )
}
