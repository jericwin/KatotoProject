import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, Star, Trash2, UploadCloud, X, ChevronLeft, ChevronRight, Save, Eye } from 'lucide-react'
import { api } from '../api'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast, useConfirm } from '../ui'

const MAX_MB = 10
const MAX_FILES = 20
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

function AlbumSettings({ album, onSaved }) {
  const [form, setForm] = useState({ title: album.title, description: album.description })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const dirty = form.title !== album.title || form.description !== album.description

  const save = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setErrors({ title: 'The album needs a name.' })
    setBusy(true)
    try {
      onSaved((await api(`/admin/albums/${album.id}`, { method: 'PUT', body: form })).album)
      setErrors({})
      toast('Album details saved.')
    } catch (err) {
      setErrors(err.errors)
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-form" onSubmit={save} noValidate>
      <h2 className="a-h2">Album details</h2>
      <Field label="Album name" value={form.title} onChange={(title) => setForm((f) => ({ ...f, title }))} error={errors.title} maxLength={120} />
      <Field
        label="Description"
        multiline
        rows={3}
        value={form.description}
        onChange={(description) => setForm((f) => ({ ...f, description }))}
        error={errors.description}
        maxLength={600}
      />
      <div className="a-form__actions">
        <button type="submit" className="a-btn" disabled={!dirty || busy}>
          <Save aria-hidden="true" /> {busy ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </form>
  )
}

function Uploader({ albumId, onUploaded }) {
  const [files, setFiles] = useState([])
  const [problems, setProblems] = useState([])
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [permission, setPermission] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const inputRef = useRef(null)
  const toast = useToast()

  // Revoke any remaining preview URLs when leaving the page.
  const filesRef = useRef(files)
  filesRef.current = files
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  const add = (list) => {
    const bad = []
    const next = []
    for (const file of list) {
      if (!TYPES.includes(file.type)) bad.push(`${file.name}: use JPEG, PNG, or WebP.`)
      else if (file.size > MAX_MB * 1024 * 1024) bad.push(`${file.name}: larger than ${MAX_MB} MB.`)
      else next.push({ file, preview: URL.createObjectURL(file), caption: '', alt: '' })
    }
    const room = MAX_FILES - files.length
    if (next.length > room) {
      bad.push(`Only ${MAX_FILES} photos can be uploaded at once; ${next.length - room} were left out.`)
      next.splice(room).forEach((f) => URL.revokeObjectURL(f.preview))
    }
    setProblems(bad)
    setFiles((f) => [...f, ...next])
  }

  const remove = (i) =>
    setFiles((f) => {
      URL.revokeObjectURL(f[i].preview)
      return f.filter((_, j) => j !== i)
    })

  const upload = async () => {
    if (!permission) {
      setPermissionError('Confirm that Katoto has permission to publish these photos.')
      document.getElementById('upload-permission')?.focus()
      return
    }
    const form = new FormData()
    form.append('permission', 'confirmed')
    files.forEach((f) => {
      form.append('photos', f.file)
      form.append('captions', f.caption)
      form.append('alts', f.alt)
    })
    setBusy(true)
    try {
      const { album } = await api(`/admin/albums/${albumId}/photos`, { method: 'POST', form })
      toast(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded.`)
      files.forEach((f) => URL.revokeObjectURL(f.preview))
      setFiles([])
      setPermission(false)
      onUploaded(album)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="a-card" aria-labelledby="upload-title">
      <h2 className="a-h2" id="upload-title">
        Upload photos
      </h2>
      <div
        className={`a-drop ${drag ? 'is-drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          add(e.dataTransfer.files)
        }}
      >
        <UploadCloud aria-hidden="true" />
        <p>
          Drag photos here, or{' '}
          <button type="button" className="a-link" onClick={() => inputRef.current?.click()}>
            choose files
          </button>
        </p>
        <p className="a-drop__hint">
          JPEG, PNG, or WebP · up to {MAX_MB} MB each · {MAX_FILES} at a time. Photos are resized and location data is
          removed automatically.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {problems.length > 0 && (
        <ul className="admin-alert admin-alert--error a-problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <>
          <p className="a-muted">Preview: check each photo and add a caption before uploading.</p>
          <ul className="a-pending">
            {files.map((f, i) => (
              <li key={f.preview}>
                <img src={f.preview} alt={`Preview of ${f.file.name}`} />
                <div className="a-pending__fields">
                  <Field
                    label="Caption"
                    hint="Shown under the photo. Only include verified names, events, or dates."
                    value={f.caption}
                    maxLength={300}
                    onChange={(caption) => setFiles((all) => all.map((x, j) => (j === i ? { ...x, caption } : x)))}
                  />
                  <Field
                    label="Description for screen readers"
                    hint="Describe what is in the photo."
                    value={f.alt}
                    maxLength={400}
                    onChange={(alt) => setFiles((all) => all.map((x, j) => (j === i ? { ...x, alt } : x)))}
                  />
                </div>
                <button type="button" className="a-icon-btn a-icon-btn--danger" onClick={() => remove(i)}>
                  <X aria-hidden="true" />
                  <span className="visually-hidden">Remove {f.file.name} from upload</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="a-field">
            <label className="a-check" htmlFor="upload-permission">
              <input
                id="upload-permission"
                type="checkbox"
                checked={permission}
                aria-invalid={permissionError ? 'true' : undefined}
                aria-describedby={permissionError ? 'upload-permission-err' : undefined}
                onChange={(e) => {
                  setPermission(e.target.checked)
                  setPermissionError('')
                }}
              />
              Katoto has permission to publish these photos from the people who can be recognized in them, and from a
              parent or guardian for anyone under 18.
            </label>
            {permissionError && (
              <p className="a-field__error" id="upload-permission-err">
                {permissionError}
              </p>
            )}
          </div>
          <div className="a-form__actions">
            <button type="button" className="a-btn a-btn--ghost" onClick={() => setFiles([])} disabled={busy}>
              Clear
            </button>
            <button type="button" className="a-btn" onClick={upload} disabled={busy}>
              <UploadCloud aria-hidden="true" /> {busy ? `Uploading ${files.length}…` : `Upload ${files.length} photo${files.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function PhotoCard({ photo, index, count, isCover, albums, albumId, onAlbum, onMove, onView }) {
  const [form, setForm] = useState({ caption: photo.caption, alt: photo.alt })
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()
  const dirty = form.caption !== photo.caption || form.alt !== photo.alt

  useEffect(() => setForm({ caption: photo.caption, alt: photo.alt }), [photo.caption, photo.alt])

  const act = async (fn, msg) => {
    setBusy(true)
    try {
      const res = await fn()
      if (res?.album) onAlbum(res.album)
      if (msg) toast(msg)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="a-photo">
      <button type="button" className="a-photo__img" onClick={onView}>
        <img src={photo.thumb} alt={photo.alt || photo.caption || `Photo ${index + 1}`} loading="lazy" />
        {isCover && (
          <span className="a-photo__cover">
            <Star aria-hidden="true" /> Cover
          </span>
        )}
        <span className="visually-hidden">Preview photo {index + 1}</span>
      </button>
      <div className="a-photo__body">
        <Field label="Caption" value={form.caption} maxLength={300} onChange={(caption) => setForm((f) => ({ ...f, caption }))} />
        <Field label="Screen-reader description" value={form.alt} maxLength={400} onChange={(alt) => setForm((f) => ({ ...f, alt }))} />
        {dirty && (
          <button
            type="button"
            className="a-btn a-btn--sm"
            disabled={busy}
            onClick={() => act(() => api(`/admin/photos/${photo.id}`, { method: 'PUT', body: form }), 'Photo details saved.')}
          >
            <Save aria-hidden="true" /> Save
          </button>
        )}
      </div>
      <div className="a-photo__tools">
        <button type="button" className="a-icon-btn" disabled={index === 0 || busy} onClick={() => onMove(index, -1)} title="Move earlier">
          <ChevronLeft aria-hidden="true" />
          <span className="visually-hidden">Move photo {index + 1} earlier</span>
        </button>
        <button type="button" className="a-icon-btn" disabled={index === count - 1 || busy} onClick={() => onMove(index, 1)} title="Move later">
          <ChevronRight aria-hidden="true" />
          <span className="visually-hidden">Move photo {index + 1} later</span>
        </button>
        <button
          type="button"
          className="a-icon-btn"
          disabled={isCover || busy}
          title="Use as album cover"
          onClick={() => act(() => api(`/admin/albums/${albumId}`, { method: 'PUT', body: { coverPhotoId: photo.id } }), 'Cover updated.')}
        >
          <Star aria-hidden="true" />
          <span className="visually-hidden">Use photo {index + 1} as album cover</span>
        </button>
        {albums.length > 1 && (
          <label className="a-move">
            <ArrowLeftRight aria-hidden="true" />
            <span className="visually-hidden">Move photo {index + 1} to another album</span>
            <select
              value=""
              disabled={busy}
              onChange={(e) => {
                const target = Number(e.target.value)
                act(async () => {
                  await api(`/admin/photos/${photo.id}`, { method: 'PUT', body: { ...form, albumId: target } })
                  return api(`/admin/albums/${albumId}`)
                }, 'Photo moved.')
              }}
            >
              <option value="" disabled>
                Move to…
              </option>
              {albums
                .filter((a) => a.id !== albumId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="a-icon-btn a-icon-btn--danger"
          disabled={busy}
          title="Delete photo"
          onClick={async () => {
            const ok = await confirm({
              title: 'Delete this photo?',
              message: 'It will be removed from the website and its file deleted from the server. This can’t be undone.',
              confirmLabel: 'Delete photo',
            })
            if (ok) act(() => api(`/admin/photos/${photo.id}`, { method: 'DELETE' }), 'Photo deleted.')
          }}
        >
          <Trash2 aria-hidden="true" />
          <span className="visually-hidden">Delete photo {index + 1}</span>
        </button>
      </div>
    </li>
  )
}

export default function AlbumDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { status, data, error, reload, setData } = useAsync(
    () => Promise.all([api(`/admin/albums/${id}`), api('/admin/albums')]).then(([a, all]) => ({ album: a.album, albums: all.albums })),
    [id],
  )
  const [viewing, setViewing] = useState(null)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (viewing && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [viewing])

  if (status === 'loading') return <Loading />
  if (status === 'error')
    return error.status === 404 ? (
      <p className="a-empty">
        This album no longer exists. <Link to="/admin/dashboard/albums">Back to albums</Link>
      </p>
    ) : (
      <ErrorState error={error} onRetry={reload} />
    )

  const { album, albums } = data
  const setAlbum = (a) => setData({ ...data, album: a })

  const move = async (i, d) => {
    const photos = [...album.photos]
    ;[photos[i], photos[i + d]] = [photos[i + d], photos[i]]
    setAlbum({ ...album, photos })
    try {
      setAlbum((await api(`/admin/albums/${album.id}/photos/reorder`, { method: 'POST', body: { ids: photos.map((p) => p.id) } })).album)
    } catch (err) {
      toast(err.message, 'error')
      reload()
    }
  }

  const togglePublished = async () => {
    setBusy(true)
    try {
      setAlbum((await api(`/admin/albums/${album.id}`, { method: 'PUT', body: { published: !album.published } })).album)
      toast(album.published ? 'Album hidden from the website.' : 'Album published. It is now on the website.')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const deleteAlbum = async () => {
    const ok = await confirm({
      title: `Delete “${album.title}”?`,
      message: `The album and its ${album.photos.length} photo${album.photos.length === 1 ? '' : 's'} will be permanently deleted from the website and the server.`,
      confirmLabel: 'Delete album',
    })
    if (!ok) return
    try {
      await api(`/admin/albums/${album.id}`, { method: 'DELETE' })
      toast('Album deleted.')
      navigate('/admin/dashboard/albums')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <>
      <Link to="/admin/dashboard/albums" className="a-back">
        <ArrowLeft aria-hidden="true" /> All albums
      </Link>
      <PageHeader title={album.title} description={`${album.photos.length} photo${album.photos.length === 1 ? '' : 's'}`}>
        <span className={`a-badge ${album.published ? 'a-badge--live' : ''}`}>{album.published ? 'Published' : 'Unpublished'}</span>
        <button type="button" className={`a-btn ${album.published ? 'a-btn--ghost' : ''}`} onClick={togglePublished} disabled={busy}>
          {album.published ? 'Unpublish' : 'Publish album'}
        </button>
        {!album.published && album.photos.length > 0 && (
          <a className="a-btn a-btn--ghost" href="/?preview=1#gallery" target="_blank" rel="noopener">
            <Eye aria-hidden="true" /> Preview
          </a>
        )}
      </PageHeader>

      <div className="a-split">
        <AlbumSettings key={album.updatedAt} album={album} onSaved={setAlbum} />
        <Uploader albumId={album.id} onUploaded={setAlbum} />
      </div>

      <section aria-labelledby="photos-title">
        <h2 className="a-h2" id="photos-title">
          Photos in this album
        </h2>
        {album.photos.length === 0 ? (
          <p className="a-empty">No photos yet. Upload some above; the album can be published once it has photos.</p>
        ) : (
          <ul className="a-photos">
            {album.photos.map((p, i) => (
              <PhotoCard
                key={p.id}
                photo={p}
                index={i}
                count={album.photos.length}
                isCover={album.cover?.id === p.id}
                albums={albums}
                albumId={album.id}
                onAlbum={setAlbum}
                onMove={move}
                onView={() => setViewing(p)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="a-danger-zone">
        <h2 className="a-h2">Delete album</h2>
        <p>Removes the album and all its photos from the website and the server.</p>
        <button type="button" className="a-btn a-btn--danger" onClick={deleteAlbum}>
          <Trash2 aria-hidden="true" /> Delete album
        </button>
      </section>

      <dialog ref={dialogRef} className="a-dialog a-dialog--photo" onClose={() => setViewing(null)} aria-label="Photo preview">
        {viewing && (
          <div className="a-dialog__body">
            <img src={viewing.src} alt={viewing.alt || viewing.caption || ''} />
            {viewing.caption && <p>{viewing.caption}</p>}
            <div className="a-dialog__actions">
              <button type="button" className="a-btn" onClick={() => dialogRef.current?.close()} autoFocus>
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
