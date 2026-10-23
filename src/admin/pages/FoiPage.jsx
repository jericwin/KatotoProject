import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Paperclip, ExternalLink } from 'lucide-react'
import { api } from '../api'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast, useConfirm } from '../ui'
import { formatPostDate, formatSize } from '../../site/format'

const EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.xlsx']
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function FoiForm({ initial, meta, id, onCancel, onSaved }) {
  const [form, setForm] = useState(initial)
  const [file, setFile] = useState(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const hasExisting = !!initial.fileUrl && !removeFile

  const pick = (f) => {
    setErrors((e) => ({ ...e, file: undefined }))
    if (!f) return setFile(null)
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    if (!EXTENSIONS.includes(ext)) return setErrors((e) => ({ ...e, file: `Use a ${meta.accepted} file.` }))
    if (f.size > meta.maxMb * 1024 * 1024) return setErrors((e) => ({ ...e, file: `The file must be under ${meta.maxMb} MB.` }))
    setFile(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.title.trim()) found.title = 'Enter a title.'
    if (!form.postedOn) found.postedOn = 'Choose the date.'
    if (!form.body.trim() && !file && !hasExisting) found.body = 'Write the announcement, attach a file, or both.'
    setErrors(found)
    if (Object.keys(found).length) return
    const data = new FormData()
    for (const k of ['title', 'category', 'postedOn', 'body']) data.append(k, form[k])
    data.append('published', String(form.published))
    if (removeFile && !file) data.append('removeFile', 'true')
    if (file) data.append('file', file)
    setBusy(true)
    try {
      const res = await api(id ? `/admin/foi/${id}` : '/admin/foi', { method: id ? 'PUT' : 'POST', form: data })
      toast(id ? 'Post saved.' : form.published ? 'Posted to the website.' : 'Saved as unpublished.')
      onSaved(res)
    } catch (err) {
      setErrors(err.errors || {})
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-form" onSubmit={submit} noValidate>
      <h2 className="a-h2">{id ? 'Edit post' : 'New FOI post'}</h2>
      <Field label="Title" hint="e.g. “Financial Report, January–June 2026”." value={form.title} onChange={set('title')} error={errors.title} maxLength={160} />
      <div className="a-row">
        <div className="a-field">
          <label htmlFor="foi-category">Category</label>
          <select id="foi-category" value={form.category} onChange={(e) => set('category')(e.target.value)}>
            {meta.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Field label="Date" type="date" value={form.postedOn} onChange={set('postedOn')} error={errors.postedOn} max="2100-12-31" />
      </div>
      <Field
        label="Announcement or summary"
        hint="Shown on the website above the file. Optional when a file is attached."
        multiline
        rows={5}
        value={form.body}
        onChange={set('body')}
        error={errors.body}
        maxLength={4000}
      />

      <div className="a-field">
        <label htmlFor="foi-file">{hasExisting ? 'Replace file (optional)' : 'Attach a file (optional)'}</label>
        <p className="a-field__hint" id="foi-file-hint">
          {meta.accepted}, up to {meta.maxMb} MB. PDFs and images open in the browser; Word and Excel files download.
          Images are re-saved without location data. Before posting, remove personal details that aren’t needed, such
          as home addresses, phone numbers, or ID numbers.
        </p>
        {hasExisting && (
          <div className="a-file-current">
            <Paperclip aria-hidden="true" />
            <a href={initial.fileUrl} target="_blank" rel="noopener">
              {initial.fileName}
            </a>
            <span className="a-muted">{formatSize(initial.fileSize)}</span>
            {!file && (
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setRemoveFile(true)}>
                Remove file
              </button>
            )}
          </div>
        )}
        {removeFile && !file && (
          <p className="a-muted">
            The current file will be removed when you save.{' '}
            <button type="button" className="a-link" onClick={() => setRemoveFile(false)}>
              Keep it
            </button>
          </p>
        )}
        <input
          id="foi-file"
          type="file"
          accept={EXTENSIONS.join(',')}
          aria-describedby="foi-file-hint"
          aria-invalid={errors.file ? 'true' : undefined}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {errors.file && <p className="a-field__error">{errors.file}</p>}
      </div>

      <label className="a-check">
        <input type="checkbox" checked={form.published} onChange={(e) => set('published')(e.target.checked)} />
        Published (visible on the website)
      </label>
      <div className="a-form__actions">
        <button type="button" className="a-btn a-btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="a-btn" disabled={busy}>
          {busy ? (file ? 'Uploading…' : 'Saving…') : id ? 'Save changes' : 'Post'}
        </button>
      </div>
    </form>
  )
}

export default function FoiPage() {
  const { status, data, error, reload, setData } = useAsync(() => api('/admin/foi'), [])
  const [editing, setEditing] = useState(null) // 'new' | id
  const toast = useToast()
  const confirm = useConfirm()

  const run = async (path, opts, msg) => {
    try {
      setData(await api(path, opts))
      toast(msg)
    } catch (err) {
      toast(err.message, 'error')
      reload()
    }
  }
  const saved = (res) => {
    setData(res)
    setEditing(null)
  }

  return (
    <>
      <PageHeader
        title="Freedom of Information"
        description="Reports, audit results, and announcements in the homepage’s Transparency section, newest date first."
      >
        <a href="/#foi" target="_blank" rel="noopener" className="a-btn a-btn--ghost">
          <ExternalLink aria-hidden="true" /> View section
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <button type="button" className="a-btn" onClick={() => setEditing('new')} disabled={editing === 'new'}>
          <Plus aria-hidden="true" /> New post
        </button>
      </PageHeader>

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && editing === 'new' && (
        <FoiForm
          initial={{ title: '', category: data.categories[0], postedOn: today(), body: '', published: true }}
          meta={data}
          onCancel={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {data && (data?.posts || []).length === 0 && editing !== 'new' && (
        <p className="a-empty">Nothing posted yet. Add a financial report, audit result, or announcement.</p>
      )}
      {data && (data?.posts || []).length > 0 && (
        <ul className="a-foi">
          {(data?.posts || []).map((p) =>
            editing === p.id ? (
              <li key={p.id}>
                <FoiForm id={p.id} initial={p} meta={data} onCancel={() => setEditing(null)} onSaved={saved} />
              </li>
            ) : (
              <li key={p.id} className={`a-foi__item ${p.published ? '' : 'is-hidden'}`}>
                <div className="a-foi__text">
                  <p className="a-news__meta">
                    <span>{p.category}</span> · {formatPostDate(p.postedOn)}
                    {!p.published && <span className="a-badge">Unpublished</span>}
                  </p>
                  <strong>{p.title}</strong>
                  {p.body && <p>{p.body}</p>}
                  {p.fileUrl && (
                    <a className="a-foi__file" href={p.fileUrl} target="_blank" rel="noopener">
                      <Paperclip aria-hidden="true" /> {p.fileName} ({formatSize(p.fileSize)})
                    </a>
                  )}
                </div>
                <div className="a-foi__tools">
                  <button
                    type="button"
                    className="a-icon-btn"
                    title={p.published ? 'Hide from website' : 'Publish'}
                    onClick={() =>
                      run(`/admin/foi/${p.id}/published`, { method: 'POST', body: { published: !p.published } }, p.published ? 'Hidden from the website.' : 'Published.')
                    }
                  >
                    {p.published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    <span className="visually-hidden">
                      {p.published ? 'Hide' : 'Publish'} “{p.title}”
                    </span>
                  </button>
                  <button type="button" className="a-icon-btn" onClick={() => setEditing(p.id)}>
                    <Pencil aria-hidden="true" />
                    <span className="visually-hidden">Edit “{p.title}”</span>
                  </button>
                  <button
                    type="button"
                    className="a-icon-btn a-icon-btn--danger"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete this post?',
                        message: `“${p.title}”${p.fileUrl ? ' and its attached file' : ''} will be permanently removed from the website and the server.`,
                        confirmLabel: 'Delete post',
                      })
                      if (ok) run(`/admin/foi/${p.id}`, { method: 'DELETE' }, 'Post deleted.')
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="visually-hidden">Delete “{p.title}”</span>
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </>
  )
}
