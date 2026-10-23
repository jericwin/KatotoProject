import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'
import { Field, PageHeader, Loading, ErrorState, useAsync, useToast, useConfirm } from '../ui'

const empty = { dateLabel: '', title: '', body: '', tag: 'Announcement', published: true }

function NewsForm({ initial, tags, onCancel, onSaved, id }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!form.dateLabel.trim()) found.dateLabel = 'Enter a date, e.g. “October 18, 2026”.'
    if (!form.title.trim()) found.title = 'Enter a title.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const data = await api(id ? `/admin/news/${id}` : '/admin/news', { method: id ? 'PUT' : 'POST', body: form })
      toast(id ? 'Update saved.' : form.published ? 'Update added to the website.' : 'Update saved as unpublished.')
      onSaved(data)
    } catch (err) {
      setErrors(err.errors || {})
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-form" onSubmit={submit} noValidate>
      <h2 className="a-h2">{id ? 'Edit update' : 'New update'}</h2>
      <div className="a-row">
        <Field
          label="Date"
          hint="As it should appear, e.g. “October 18, 2026” or “2026”."
          value={form.dateLabel}
          onChange={set('dateLabel')}
          error={errors.dateLabel}
          maxLength={60}
        />
        <div className="a-field">
          <label htmlFor="news-tag">Tag</label>
          <select id="news-tag" value={form.tag} onChange={(e) => set('tag')(e.target.value)}>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={160} />
      <Field label="Details" multiline rows={4} value={form.body} onChange={set('body')} error={errors.body} maxLength={2000} />
      <label className="a-check">
        <input type="checkbox" checked={form.published} onChange={(e) => set('published')(e.target.checked)} />
        Published (visible on the website)
      </label>
      <div className="a-form__actions">
        <button type="button" className="a-btn a-btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="a-btn" disabled={busy}>
          {busy ? 'Saving…' : id ? 'Save changes' : 'Add update'}
        </button>
      </div>
    </form>
  )
}

export default function NewsPage() {
  const { status, data, error, reload, setData } = useAsync(() => api('/admin/news'), [])
  const [editing, setEditing] = useState(null) // 'new' | id
  const toast = useToast()
  const confirm = useConfirm()

  const update = async (path, opts, msg) => {
    try {
      const res = await api(path, opts)
      setData({ ...data, news: res.news })
      if (msg) toast(msg)
    } catch (err) {
      toast(err.message, 'error')
      reload()
    }
  }

  const move = (i, d) => {
    const news = [...data.news]
    ;[news[i], news[i + d]] = [news[i + d], news[i]]
    setData({ ...data, news })
    update('/admin/news/reorder', { method: 'POST', body: { ids: news.map((n) => n.id) } })
  }

  return (
    <>
      <PageHeader title="News & updates" description="The “From the record” timeline on the homepage, shown top to bottom in this order.">
        <button type="button" className="a-btn" onClick={() => setEditing('new')} disabled={editing === 'new'}>
          <Plus aria-hidden="true" /> New update
        </button>
      </PageHeader>

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && editing === 'new' && (
        <NewsForm
          initial={empty}
          tags={data.tags}
          onCancel={() => setEditing(null)}
          onSaved={(res) => {
            setData({ ...data, news: res.news })
            setEditing(null)
          }}
        />
      )}
      {data && (
        <ul className="a-news">
          {data.news.map((n, i) =>
            editing === n.id ? (
              <li key={n.id}>
                <NewsForm
                  id={n.id}
                  initial={{ dateLabel: n.dateLabel, title: n.title, body: n.body, tag: n.tag, published: n.published }}
                  tags={data.tags}
                  onCancel={() => setEditing(null)}
                  onSaved={(res) => {
                    setData({ ...data, news: res.news })
                    setEditing(null)
                  }}
                />
              </li>
            ) : (
              <li key={n.id} className={`a-news__item ${n.published ? '' : 'is-hidden'}`}>
                <div className="a-news__text">
                  <p className="a-news__meta">
                    <span>{n.tag}</span> · {n.dateLabel}
                    {!n.published && <span className="a-badge">Unpublished</span>}
                  </p>
                  <strong>{n.title}</strong>
                  {n.body && <p>{n.body}</p>}
                </div>
                <div className="a-news__tools">
                  <button type="button" className="a-icon-btn" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp aria-hidden="true" />
                    <span className="visually-hidden">Move “{n.title}” up</span>
                  </button>
                  <button type="button" className="a-icon-btn" disabled={i === (data?.news || []).length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown aria-hidden="true" />
                    <span className="visually-hidden">Move “{n.title}” down</span>
                  </button>
                  <button
                    type="button"
                    className="a-icon-btn"
                    title={n.published ? 'Hide from website' : 'Publish'}
                    onClick={() =>
                      update(
                        `/admin/news/${n.id}`,
                        { method: 'PUT', body: { dateLabel: n.dateLabel, title: n.title, body: n.body, tag: n.tag, published: !n.published } },
                        n.published ? 'Hidden from the website.' : 'Published.',
                      )
                    }
                  >
                    {n.published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    <span className="visually-hidden">
                      {n.published ? 'Hide' : 'Publish'} “{n.title}”
                    </span>
                  </button>
                  <button type="button" className="a-icon-btn" onClick={() => setEditing(n.id)}>
                    <Pencil aria-hidden="true" />
                    <span className="visually-hidden">Edit “{n.title}”</span>
                  </button>
                  <button
                    type="button"
                    className="a-icon-btn a-icon-btn--danger"
                    onClick={async () => {
                      if (await confirm({ title: 'Delete this update?', message: `“${n.title}” will be removed permanently.`, confirmLabel: 'Delete update' }))
                        update(`/admin/news/${n.id}`, { method: 'DELETE' }, 'Update deleted.')
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="visually-hidden">Delete “{n.title}”</span>
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
