import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ImageOff, ArrowUp, ArrowDown } from 'lucide-react'
import { api } from '../api'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast } from '../ui'

export default function Albums() {
  const { status, data, error, reload, setData } = useAsync(() => api('/admin/albums'), [])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const create = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setErrors({ title: 'Give the album a name.' })
    setBusy(true)
    try {
      const { album } = await api('/admin/albums', { method: 'POST', body: form })
      toast('Album created. Add photos, then publish it.')
      navigate(`/admin/dashboard/albums/${album.id}`)
    } catch (err) {
      setErrors(err.errors)
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const move = async (i, d) => {
    const albums = [...data.albums]
    ;[albums[i], albums[i + d]] = [albums[i + d], albums[i]]
    setData({ albums })
    try {
      setData(await api('/admin/albums/reorder', { method: 'POST', body: { ids: albums.map((a) => a.id) } }))
    } catch (err) {
      toast(err.message, 'error')
      reload()
    }
  }

  return (
    <>
      <PageHeader title="Photo albums" description="Albums appear in “Our activities” on the website, in this order. Only published albums are public.">
        <button type="button" className="a-btn" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
          <Plus aria-hidden="true" /> New album
        </button>
      </PageHeader>

      {creating && (
        <form className="a-card a-form" onSubmit={create} noValidate>
          <h2 className="a-h2">New album</h2>
          <Field
            label="Album name"
            hint="Use the real event or activity name, e.g. “Brigada Eskwela 2026”."
            value={form.title}
            onChange={(title) => setForm((f) => ({ ...f, title }))}
            error={errors.title}
            maxLength={120}
            required
          />
          <Field
            label="Description (optional)"
            multiline
            rows={3}
            value={form.description}
            onChange={(description) => setForm((f) => ({ ...f, description }))}
            error={errors.description}
            maxLength={600}
          />
          <div className="a-form__actions">
            <button type="button" className="a-btn a-btn--ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" className="a-btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create album'}
            </button>
          </div>
        </form>
      )}

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && data.albums.length === 0 && <p className="a-empty">No albums yet. Create one to start uploading photos.</p>}
      {data && data.albums.length > 0 && (
        <ul className="a-albums">
          {data.albums.map((a, i) => (
            <li key={a.id} className="a-album">
              <Link to={`/admin/dashboard/albums/${a.id}`} className="a-album__link">
                <span className="a-album__cover">
                  {a.cover ? <img src={a.cover.thumb} alt="" loading="lazy" /> : <ImageOff aria-hidden="true" />}
                </span>
                <span className="a-album__text">
                  <strong>{a.title}</strong>
                  <span>
                    {a.photos.length} photo{a.photos.length === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
              <span className={`a-badge ${a.published ? 'a-badge--live' : ''}`}>{a.published ? 'Published' : 'Unpublished'}</span>
              <div className="a-album__order">
                <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden="true" />
                  <span className="visually-hidden">Move {a.title} up</span>
                </button>
                <button type="button" className="a-icon-btn" disabled={i === data.albums.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden="true" />
                  <span className="visually-hidden">Move {a.title} down</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
