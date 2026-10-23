import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { POLICY_UPDATED } from '../data/legal'
import './LegalPage.css'

// Shared layout for the privacy, terms, cookie and data-request pages.
export default function LegalPage({ title, intro, sections, updated = POLICY_UPDATED, children }) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · Katoto Project`
    return () => {
      document.title = prev
    }
  }, [title])

  return (
    <article className="legal">
      <div className="container legal__inner">
        <header className="legal__head">
          <p className="eyebrow">
            <Link to="/">Katoto Project</Link>
          </p>
          <h1>{title}</h1>
          {updated && <p className="legal__updated">Last updated {updated}</p>}
          {intro && <div className="legal__intro">{intro}</div>}
        </header>

        {sections?.length > 0 && (
          <nav className="legal__toc" aria-labelledby="legal-toc">
            <h2 id="legal-toc">On this page</h2>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="legal__body">{children}</div>
      </div>
    </article>
  )
}

export function Section({ id, title, children }) {
  return (
    <section id={id} className="legal__section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  )
}

// Marks a fact that Katoto Project still has to confirm, so it is visible
// rather than silently invented.
export function ToConfirm({ children }) {
  return <span className="legal__confirm">{children}</span>
}
