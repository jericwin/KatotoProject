import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2, X } from 'lucide-react'

// --- Toasts -------------------------------------------------------------------
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            <span>{t.message}</span>
            <button type="button" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}>
              <X aria-hidden="true" />
              <span className="visually-hidden">Dismiss</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// --- Confirm dialog (promise-based) -----------------------------------------
const ConfirmContext = createContext(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null)
  const ref = useRef(null)
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setReq({ confirmLabel: 'Delete', tone: 'danger', ...opts, resolve })
      }),
    [],
  )
  useEffect(() => {
    if (req && ref.current && !ref.current.open) ref.current.showModal()
  }, [req])
  const finish = (value) => {
    req?.resolve(value)
    ref.current?.close()
    setReq(null)
  }
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog ref={ref} className="a-dialog" onClose={() => req && finish(false)} aria-labelledby="confirm-title">
        {req && (
          <div className="a-dialog__body">
            <h2 id="confirm-title">{req.title}</h2>
            {req.message && <p>{req.message}</p>}
            <div className="a-dialog__actions">
              <button type="button" className="a-btn a-btn--ghost" onClick={() => finish(false)} autoFocus>
                Cancel
              </button>
              <button type="button" className={`a-btn ${req.tone === 'danger' ? 'a-btn--danger' : ''}`} onClick={() => finish(true)}>
                {req.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}

// --- Form fields -------------------------------------------------------------
export function Field({ label, hint, error, multiline, rows = 4, value, onChange, maxLength, ...rest }) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="a-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="a-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <Tag
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? rows : undefined}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {maxLength && multiline && (
        <p className="a-field__count" aria-hidden="true">
          {(value || '').length} / {maxLength}
        </p>
      )}
      {error && (
        <p className="a-field__error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  )
}

// Edits an array of strings or objects with add / remove / reorder.
export function ListEditor({ label, items, onChange, render, makeItem, addLabel = 'Add item', max = 12, min = 0, errors = {}, prefix }) {
  const move = (i, d) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <fieldset className="a-list">
      <legend>{label}</legend>
      {errors[prefix] && <p className="a-field__error">{errors[prefix]}</p>}
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            <span className="a-list__num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="a-list__body">
              {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
            </div>
            <div className="a-list__tools">
              <button type="button" className="a-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
                <ArrowUp aria-hidden="true" />
                <span className="visually-hidden">Move item {i + 1} up</span>
              </button>
              <button type="button" className="a-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">
                <ArrowDown aria-hidden="true" />
                <span className="visually-hidden">Move item {i + 1} down</span>
              </button>
              <button
                type="button"
                className="a-icon-btn a-icon-btn--danger"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                disabled={items.length <= min}
                title="Remove"
              >
                <Trash2 aria-hidden="true" />
                <span className="visually-hidden">Remove item {i + 1}</span>
              </button>
            </div>
          </li>
        ))}
      </ol>
      {items.length < max && (
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange([...items, makeItem()])}>
          <Plus aria-hidden="true" /> {addLabel}
        </button>
      )}
    </fieldset>
  )
}

export function PageHeader({ title, description, children }) {
  return (
    <header className="a-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="a-page-head__actions">{children}</div>}
    </header>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="a-loading" role="status">
      <span className="a-spinner" aria-hidden="true" /> {label}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="admin-alert admin-alert--error" role="alert">
      <span>{error?.message || 'Something went wrong.'}</span>
      {onRetry && (
        <button type="button" className="a-btn a-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function useAsync(fn, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      setState({ status: 'ready', data: await fn(), error: null })
    } catch (error) {
      setState({ status: 'error', data: null, error })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) }
}
