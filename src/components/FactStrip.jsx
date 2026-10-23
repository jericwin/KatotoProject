import Reveal from './ui/Reveal'
import { facts } from '../data/organization'
import { useSite } from '../site/SiteContext'
import './FactStrip.css'

export default function FactStrip() {
  const coordinators = useSite().content.people?.coordinators
  // The coordinator count follows the list editable in the admin.
  const shown = facts.map((f) =>
    f.label === 'Barangay coordinators' && coordinators ? { ...f, value: String(coordinators.length) } : f,
  )
  return (
    <section className="facts" aria-label="Katoto Project at a glance">
      <div className="container">
        <dl className="facts__list">
          {shown.map((f, i) => (
            <Reveal key={f.label} className="facts__item" delay={i * 0.06}>
              <dt className="facts__label">{f.label}</dt>
              <dd className="facts__value">{f.value}</dd>
              <dd className="facts__note">{f.note}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}
