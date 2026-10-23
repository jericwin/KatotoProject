import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import { pillars } from '../data/pillars'
import { objectives } from '../data/organization'
import { useSite } from '../site/SiteContext'
import './Pillars.css'

const objectiveText = Object.fromEntries(objectives.map((o) => [o.id, o.text]))

export default function Pillars() {
  const { content } = useSite()
  const people = content.people
  const text = (p) => ({ ...p, ...content.pillars?.[p.id], lead: people?.committees?.[p.id] || p.lead })
  return (
    <section id="pillars" className="section pillars" aria-labelledby="pillars-title">
      <div className="container">
        <SectionHeader num="02" label="What we work on" id="pillars-title" title="Six pillars, six committees.">
          <p>
            Katoto organizes its work around six pillars. Each has a standing committee led by a member, with its own
            head, assistant head, and volunteers drawn from the membership.
          </p>
        </SectionHeader>

        <ol className="pillar-list">
          {pillars.map(text).map((p, i) => (
            <li key={p.id} id={`pillar-${p.id}`} className={`pillar ${i < 2 ? 'pillar--feature' : 'pillar--compact'} ${i === 1 ? 'pillar--flip' : ''}`} style={{ '--ring': p.color }}>
              <Reveal className="pillar__media">
                <figure>
                  <img src={p.image} alt={p.alt} width="184" height="184" loading="lazy" decoding="async" />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              </Reveal>

              <Reveal className="pillar__body" delay={0.08}>
                <p className="pillar__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="pillar__name">{p.name}</h3>
                <p className="pillar__summary">{p.summary}</p>

                {p.objectives.length > 0 && (
                  <div className="pillar__objectives">
                    <p className="pillar__meta-label">Constitutional objective{p.objectives.length > 1 ? 's' : ''}</p>
                    <ul>
                      {p.objectives.map((id) => (
                        <li key={id}>{objectiveText[id]}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(p.lead.head || p.lead.assistant) && (
                  <dl className="pillar__lead">
                    {p.lead.head && (
                      <div>
                        <dt>Committee head</dt>
                        <dd>{p.lead.head}</dd>
                      </div>
                    )}
                    {p.lead.assistant && (
                      <div>
                        <dt>Assistant head</dt>
                        <dd>{p.lead.assistant}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </Reveal>
            </li>
          ))}
        </ol>

        {people?.term && (
          <Reveal as="p" className="pillars__note">
            Committee leadership is for the term of {people.term}.
          </Reveal>
        )}
      </div>
    </section>
  )
}
