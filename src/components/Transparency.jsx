import { useState } from 'react'
import { FileText, FileSpreadsheet, Image as ImageIcon, Download, ArrowUpRight, ScrollText } from 'lucide-react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import { useSite } from '../site/SiteContext'
import { formatPostDate, formatSize } from '../site/format'
import './Transparency.css'

const INITIAL = 6

function fileKind(type = '') {
  if (type === 'application/pdf') return { label: 'PDF', icon: FileText, inline: true }
  if (type.startsWith('image/')) return { label: 'image', icon: ImageIcon, inline: true }
  if (type.includes('spreadsheet')) return { label: 'Excel file', icon: FileSpreadsheet, inline: false }
  return { label: 'Word file', icon: FileText, inline: false }
}

function FileLink({ post }) {
  const kind = fileKind(post.fileType)
  const Icon = kind.icon
  return (
    <a
      href={post.fileUrl}
      className="foi__file"
      data-track="foi"
      {...(kind.inline ? { target: '_blank', rel: 'noopener' } : { download: post.fileName })}
    >
      <Icon aria-hidden="true" className="foi__file-icon" />
      <span className="foi__file-text">
        <strong>{kind.inline ? `View ${kind.label}` : `Download ${kind.label}`}</strong>
        <span>
          {post.fileName} · {formatSize(post.fileSize)}
        </span>
      </span>
      {kind.inline ? <ArrowUpRight aria-hidden="true" /> : <Download aria-hidden="true" />}
      {kind.inline && <span className="visually-hidden">(opens in a new tab)</span>}
    </a>
  )
}

export default function Transparency() {
  const { content, foi = [] } = useSite()
  const [category, setCategory] = useState('All')
  const [showAll, setShowAll] = useState(false)

  const categories = ['All', ...new Set(foi.map((p) => p.category))]
  const filtered = category === 'All' ? foi : foi.filter((p) => p.category === category)
  const shown = showAll ? filtered : filtered.slice(0, INITIAL)
  const foiHead = content.people?.groups
    ?.flatMap((g) => g.members)
    .find((m) => /freedom of information/i.test(m.role))
  const email = content.contact.email

  return (
    <section id="foi" className="section foi" aria-labelledby="foi-title">
      <div className="container">
        <SectionHeader num="05" label="Transparency" id="foi-title" title="Freedom of Information.">
          <p>
            Financial reports, audit results, and announcements that Katoto Project makes public. Katoto’s Freedom of
            Information officers review the organization’s financial statements and records.
          </p>
        </SectionHeader>

        {foi.length === 0 ? (
          <Reveal className="foi__empty">
            <ScrollText aria-hidden="true" />
            <p>No reports or announcements have been posted here yet.</p>
          </Reveal>
        ) : (
          <>
            {categories.length > 2 && (
              <div className="foi__filters" role="group" aria-label="Filter by category">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => {
                      setCategory(c)
                      setShowAll(false)
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <ul className="foi__list">
              {shown.map((p) => (
                <li key={p.id} className="foi__item">
                  <p className="foi__meta">
                    <span className="foi__tag">{p.category}</span>
                    <time dateTime={p.postedOn}>{formatPostDate(p.postedOn)}</time>
                  </p>
                  <h3>{p.title}</h3>
                  {p.body && <p className="foi__body">{p.body}</p>}
                  {p.fileUrl && <FileLink post={p} />}
                </li>
              ))}
            </ul>
            {filtered.length > INITIAL && (
              <button type="button" className="btn btn-ghost foi__more" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
              </button>
            )}
          </>
        )}

        <Reveal className="foi__request">
          <p>
            Looking for a record that isn’t here? Email{' '}
            <a href={`mailto:${email}?subject=${encodeURIComponent('Freedom of Information request')}`}>{email}</a>
            {foiHead ? (
              <>
                . Katoto’s Freedom of Information Head is <strong>{foiHead.name}</strong>.
              </>
            ) : (
              '.'
            )}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
