import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import './Lightbox.css'

// Native <dialog> gives us focus trapping, Escape-to-close and an inert page.
export default function Lightbox({ items, index, onClose, onIndex }) {
  const ref = useRef(null)
  const open = index !== null && index !== undefined
  const item = open ? items[index] : null
  const many = items.length > 1

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open || !many) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, many, index, items.length, onIndex])

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={item ? item.title : 'Image viewer'}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {item && (
        <div className="lightbox__frame">
          <button type="button" className="lightbox__close" onClick={onClose} autoFocus>
            <X aria-hidden="true" />
            <span className="visually-hidden">Close viewer</span>
          </button>

          <figure className={`lightbox__figure lightbox__figure--${item.kind}`}>
            <img
              key={item.id}
              src={item.src}
              alt={item.alt}
              style={item.color ? { '--ring': item.color } : undefined}
            />
            <figcaption>
              <strong>{item.title}</strong>
              <span>{item.caption}</span>
              {many && (
                <span className="lightbox__count">
                  {index + 1} / {items.length}
                </span>
              )}
            </figcaption>
          </figure>

          {many && (
            <div className="lightbox__nav">
              <button type="button" onClick={() => onIndex((index - 1 + items.length) % items.length)}>
                <ChevronLeft aria-hidden="true" />
                <span className="visually-hidden">Previous image</span>
              </button>
              <button type="button" onClick={() => onIndex((index + 1) % items.length)}>
                <ChevronRight aria-hidden="true" />
                <span className="visually-hidden">Next image</span>
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
