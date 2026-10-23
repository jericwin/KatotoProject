import { ArrowUpRight } from 'lucide-react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import FacebookIcon from './ui/FacebookIcon'
import { useSite } from '../site/SiteContext'
import './Updates.css'

const TAG_COLOR = {
  Recognition: 'var(--k-green)',
  Organization: 'var(--k-blue)',
  Announcement: 'var(--k-orange)',
  Founding: 'var(--k-red)',
  Activity: 'var(--k-teal)',
  Event: 'var(--k-yellow)',
}

export default function Updates() {
  const { news, content } = useSite()
  return (
    <section id="updates" className="section updates" aria-labelledby="updates-title">
      <div className="container updates__grid">
        <div className="updates__aside">
          <SectionHeader num="08" label="News & updates" id="updates-title" title="From the record." align="stack">
            <p>Milestones from Katoto’s own documents, newest first. Day-to-day news is posted on Facebook.</p>
          </SectionHeader>
          <Reveal className="updates__fb">
            <FacebookIcon className="updates__fb-icon" />
            <p>
              Events, call-outs, and photos are posted first on <strong>Katoto Project’s official Facebook page</strong>.
            </p>
            <a href={content.contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light">
              Open Facebook page <ArrowUpRight aria-hidden="true" />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
          </Reveal>
        </div>

        <ol className="timeline">
          {news.map((t, i) => (
            <Reveal
              as="li"
              key={t.id}
              className="timeline__item"
              delay={Math.min(i, 6) * 0.04}
              style={{ '--tag': TAG_COLOR[t.tag] || 'var(--k-purple)' }}
            >
              <div className="timeline__date">
                <span className="timeline__tag">
                  {t.tag}
                  {!t.published && ' · Unpublished'}
                </span>
                <time>{t.dateLabel}</time>
              </div>
              <div>
                <h3>{t.title}</h3>
                {t.body && <p>{t.body}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
