import { useState } from 'react'
import { Expand } from 'lucide-react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import Lightbox from './ui/Lightbox'
import { galleryItems } from '../data/gallery'
import { accreditation, governance } from '../data/organization'
import { useSite } from '../site/SiteContext'
import './Record.css'

const certificate = galleryItems.find((g) => g.id === 'doc-certificate')

export default function Record() {
  const [viewing, setViewing] = useState(null)
  const { term, groups, coordinators } = useSite().content.people

  return (
    <section id="record" className="section record" aria-labelledby="record-title">
      <div className="container">
        <SectionHeader num="04" label="Our record" id="record-title" title="Accountable to Paete." tone="dark">
          <p>
            We don’t publish numbers we can’t back up. Here is what is on paper: who recognizes Katoto, how it is
            governed, and who answers for it this term.
          </p>
        </SectionHeader>

        <div className="record__accreditation">
          <Reveal className="record__cert">
            <button type="button" className="record__cert-btn" onClick={() => setViewing(0)}>
              <img src={certificate.thumb} alt={certificate.alt} width="520" height="673" loading="lazy" decoding="async" />
              <span className="record__cert-hint">
                <Expand aria-hidden="true" /> View certificate
              </span>
            </button>
          </Reveal>

          <Reveal className="record__cert-detail" delay={0.08}>
            <p className="eyebrow record__eyebrow">Certificate of Accreditation</p>
            <h3>
              Accredited by the {accreditation.issuer}.
            </h3>
            <p className="record__scope">
              {accreditation.government} certified that {accreditation.registeredName} has complied with all
              requirements and is “{accreditation.scope}”
            </p>
            <dl className="record__meta">
              <div>
                <dt>Given</dt>
                <dd>{accreditation.date}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{accreditation.place}</dd>
              </div>
              <div>
                <dt>Certificate No.</dt>
                <dd>{accreditation.certificateNo}</dd>
              </div>
              <div>
                <dt>Organization ID</dt>
                <dd>{accreditation.organizationId}</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <div className="record__governance">
          <Reveal as="h3" className="record__subhead">
            How Katoto is run
          </Reveal>
          <ul>
            {governance.map((g, i) => (
              <Reveal as="li" key={g.title} delay={i * 0.06}>
                <h4>{g.title}</h4>
                <p>{g.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        {(groups.length > 0 || coordinators.length > 0) && (
          <div className="record__leaders">
            <Reveal className="record__leaders-head">
              <h3 className="record__subhead">Officers</h3>
              {term && <p>Term: {term}</p>}
            </Reveal>
            <div className="record__groups">
              {groups.map((group, gi) => (
                <Reveal key={`${gi}-${group.name}`} className="record__group" delay={gi * 0.05}>
                  <h4>{group.name}</h4>
                  <dl>
                    {group.members.map((person, i) => (
                      <div key={i}>
                        <dt>{person.role}</dt>
                        <dd>{person.name}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              ))}
            </div>

            {coordinators.length > 0 && (
              <Reveal className="record__brgy">
                <h4>Barangay coordinators</h4>
                <ul>
                  {coordinators.map((b, i) => (
                    <li key={i}>
                      <span>{b.area}</span>
                      {b.name}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        )}
      </div>

      <Lightbox items={[certificate]} index={viewing} onClose={() => setViewing(null)} onIndex={setViewing} />
    </section>
  )
}
