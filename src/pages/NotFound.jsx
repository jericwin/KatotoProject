import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './LegalPage.css'

export default function NotFound() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Page not found · Katoto Project'
    return () => {
      document.title = prev
    }
  }, [])
  return (
    <article className="legal">
      <div className="container legal__inner">
        <header className="legal__head">
          <p className="eyebrow">404</p>
          <h1>This page doesn’t exist.</h1>
          <p className="legal__intro">
            The link may be old or mistyped. <Link to="/">Go to the Katoto Project home page</Link>.
          </p>
        </header>
      </div>
    </article>
  )
}
