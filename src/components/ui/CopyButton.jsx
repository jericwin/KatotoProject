import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for browsers without the async clipboard API.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export default function CopyButton({ value, label, className = 'btn btn-ghost' }) {
  const [state, setState] = useState('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState('idle'), 2400)
    return () => clearTimeout(t)
  }, [state])

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => setState((await copyText(value)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {state === 'copied' ? 'Copied' : label}
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {state === 'copied' ? `${value} copied to clipboard` : state === 'failed' ? 'Copy failed. Please copy it manually.' : ''}
      </span>
    </>
  )
}
