import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { useContentDraft } from './Layout'
import { useToast } from './ui'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Local form state for one section of the site-content draft.
export function useSectionForm(section) {
  const { row, save } = useContentDraft()
  const toast = useToast()
  const source = row?.draft?.[section]
  const [value, setValue] = useState(source)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const base = useRef(source)

  // Follow server-side changes (initial load, discard) unless there are local edits.
  useEffect(() => {
    if (!source) return
    // Capture the previous base now: the updater runs later, after the ref changes.
    const previous = base.current
    base.current = source
    setValue((current) => (current === undefined || same(current, previous) ? source : current))
  }, [source])

  const dirty = !!value && !!source && !same(value, source)

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    try {
      const next = await save(section, value)
      base.current = next.draft[section]
      setValue(next.draft[section])
      setErrors({})
      toast('Saved as draft. Preview it, then Publish to update the website.')
    } catch (err) {
      setErrors(err.errors || {})
      toast(err.message, 'error')
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0)
    } finally {
      setBusy(false)
    }
  }

  const set = (key) => (v) => setValue((s) => ({ ...s, [key]: v }))
  const reset = () => {
    setValue(source)
    setErrors({})
  }

  return { value, setValue, set, errors, busy, dirty, submit, reset, ready: !!value }
}

// Warns before leaving a page with unsaved edits. Call once per page.
export function useUnsavedGuard(dirty) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('You have unsaved changes on this page. Leave without saving?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])
}
