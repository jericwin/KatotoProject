import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Expand, ArrowUpRight, Images } from 'lucide-react'
import SectionHeader from './ui/SectionHeader'
import Lightbox from './ui/Lightbox'
import { useSite } from '../site/SiteContext'
import './Gallery.css'

// Small source images (e.g. the circles cut from Katoto's "6 Pillars" graphic)
// are shown near their natural size instead of being blown up.
const SMALL = 420

export default function Gallery() {
  const { albums, content } = useSite()
  const [activeId, setActiveId] = useState(null)
  const [viewing, setViewing] = useState(null)

  const active = albums.find((a) => a.id === activeId) || albums[0]
  useEffect(() => setViewing(null), [activeId])

  const items = useMemo(
    () =>
      (active?.photos || []).map((p) => ({
        id: p.id,
        kind: 'image',
        src: p.src,
        alt: p.alt || p.caption || active.title,
        title: active.title,
        caption: p.caption,
      })),
    [active],
  )

  return (
    <section id="gallery" className="section gallery" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHeader num="06" label="Our activities" id="gallery-title" title="Photo albums from the field.">
          <p>Katoto’s events, programs, and volunteers, organized by album. Select a photo to see it larger.</p>
        </SectionHeader>

        {albums.length === 0 ? (
          <div className="gallery__empty">
            <Images aria-hidden="true" />
            <p>Photo albums are being prepared. In the meantime, see Katoto’s latest photos on Facebook.</p>
          </div>
        ) : (
          <>
            <div className="albums" role="group" aria-label="Choose an album">
              {albums.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="album-card"
                  aria-pressed={a.id === active.id}
                  onClick={() => setActiveId(a.id)}
                >
                  <span className="album-card__cover">
                    {a.cover && <img src={a.cover.thumb} alt="" loading="lazy" decoding="async" />}
                  </span>
                  <span className="album-card__text">
                    <strong>
                      {a.title}
                      {!a.published && <span className="album-card__draft">Unpublished</span>}
                    </strong>
                    <span>
                      {a.photos.length} photo{a.photos.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="album"
              >
                <div className="album__head">
                  <h3>{active.title}</h3>
                  {active.description && <p>{active.description}</p>}
                </div>
                <ul className="album__grid">
                  {active.photos.map((p, i) => {
                    const small = p.width && p.width < SMALL
                    return (
                      <li key={p.id} className={`album__item ${small ? 'album__item--small' : ''}`}>
                        <button type="button" className="album__btn" onClick={() => setViewing(i)}>
                          <span className="album__img">
                            <img
                              src={small ? p.src : p.thumb}
                              alt={p.alt || p.caption || ''}
                              width={p.width}
                              height={p.height}
                              loading="lazy"
                              decoding="async"
                            />
                            <span className="album__zoom" aria-hidden="true">
                              <Expand />
                            </span>
                          </span>
                          {p.caption && <span className="album__caption">{p.caption}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            </AnimatePresence>
          </>
        )}

        <p className="gallery__more">
          More photos from Katoto’s activities are posted on{' '}
          <a href={content.contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            the official Facebook page <ArrowUpRight aria-hidden="true" />
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        </p>
      </div>

      <Lightbox items={items} index={viewing} onClose={() => setViewing(null)} onIndex={setViewing} />
    </section>
  )
}
