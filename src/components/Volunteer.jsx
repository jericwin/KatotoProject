import { ArrowUpRight, Mail, Clock } from 'lucide-react'
import Reveal from './ui/Reveal'
import Mosaic from './ui/Mosaic'
import { useSite } from '../site/SiteContext'
import './Volunteer.css'

const isExternal = (url) => /^https?:\/\//i.test(url)

function ActionLink({ href, className, children }) {
  const external = isExternal(href)
  return (
    <a href={href} className={className} data-track="apply" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
      {external && <span className="visually-hidden">(opens in a new tab)</span>}
    </a>
  )
}

export default function Volunteer() {
  const { content } = useSite()
  const v = content.volunteer

  return (
    <section id="volunteer" className="volunteer" aria-labelledby="volunteer-title">
      <Mosaic className="volunteer__mosaic" cols={72} rows={1} seed={15302020} />
      <div className="container section volunteer__inner">
        <div className="volunteer__grid">
          <Reveal className="volunteer__intro">
            {v.eyebrow && (
              <p className="eyebrow volunteer__eyebrow">
                <span className="eyebrow-num">03</span>
                <span aria-hidden="true" className="volunteer__rule" />
                {v.eyebrow}
              </p>
            )}
            <h2 id="volunteer-title" className="volunteer__title">
              {v.heading}
            </h2>
            <p className="volunteer__lede">{v.intro}</p>

            <div className="volunteer__actions">
              {v.applyUrl ? (
                <ActionLink href={v.applyUrl} className="btn volunteer__apply">
                  {v.applyLabel} <ArrowUpRight aria-hidden="true" />
                </ActionLink>
              ) : (
                <p className="volunteer__pending" role="note">
                  <Clock aria-hidden="true" />
                  The online application isn’t open yet. Please use the contact option below.
                </p>
              )}
              {v.secondaryUrl && v.secondaryLabel && (
                <ActionLink href={v.secondaryUrl} className="btn btn-ghost">
                  <Mail aria-hidden="true" /> {v.secondaryLabel}
                </ActionLink>
              )}
            </div>
            {v.applyNote && <p className="volunteer__note">{v.applyNote}</p>}
          </Reveal>

          <Reveal className="volunteer__quals" delay={0.08}>
            <h3>Qualifications</h3>
            <ol>
              {v.qualifications.map((q, i) => (
                <li key={i}>
                  <span className="volunteer__qnum" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        {v.steps?.length > 0 && (
          <div className="volunteer__steps">
            <Reveal as="h3" className="volunteer__steps-title">
              {v.stepsTitle || 'How to apply'}
            </Reveal>
            <ol>
              {v.steps.map((s, i) => (
                <Reveal as="li" key={i} delay={i * 0.06}>
                  <span className="volunteer__step-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4>{s.title}</h4>
                  {s.body && <p>{s.body}</p>}
                </Reveal>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
