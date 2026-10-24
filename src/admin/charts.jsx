import { useEffect, useRef, useState } from 'react'

// Small SVG charts for the admin overview. Colors are the validated series
// slots in overview.css (--s1…--s4); text always uses the ink tokens.

const num = (n) => Number(n || 0).toLocaleString()

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

export function niceMax(v) {
  if (v <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step
  return 10 * step
}

// Bar path with 4px rounded top corners, anchored to the baseline.
function barPath(x, top, w, h) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`
}

function Tip({ left, top, width, children }) {
  return (
    <div className="ch-tip" style={{ left: Math.min(Math.max(left, 75), Math.max(75, width - 75)), top }}>
      {children}
    </div>
  )
}

export function Legend({ series }) {
  return (
    <ul className="ch-legend">
      {series.map((s) => (
        <li key={s.key}>
          <span className={`ch-swatch ch-swatch--${s.shape || 'box'}`} style={{ '--c': s.color }} aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * Lines over a shared x axis (one y scale). `points` is [{ label, tipLabel, [key]: n }].
 */
export function LineChart({ points, series, height = 220, ariaLabel, xLabel = (p) => p.label }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState(null)
  const pad = { top: 12, right: 12, bottom: 26, left: 38 }
  const plotW = Math.max(0, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...points.flatMap((p) => series.map((s) => p[s.key] || 0))))
  const n = points.length
  const x = (i) => pad.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v) => pad.top + plotH - (v / max) * plotH
  const ticks = [0, max / 2, max]
  const labelIdx = n ? [...new Set([0, Math.floor((n - 1) / 2), n - 1])] : []
  const a = active == null ? null : points[active]

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = (e.touches?.[0]?.clientX ?? e.clientX) - box.left
    const i = n <= 1 ? 0 : Math.round(((px - pad.left) / plotW) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div className="ch-plot" ref={ref} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="ch-grid" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="ch-axis">
                {num(t)}
              </text>
            </g>
          ))}
          {series.map((s, si) => {
            const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[s.key] || 0)}`).join(' ')
            return (
              <g key={s.key}>
                {si === 0 && n > 1 && (
                  <path d={`${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.color} opacity="0.08" />
                )}
                <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            )
          })}
          {a && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + plotH} className="ch-cross" />
              {series.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(a[s.key] || 0)} r="4.5" fill={s.color} className="ch-dot" />
              ))}
            </g>
          )}
          {labelIdx.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 6}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="ch-axis"
            >
              {xLabel(points[i])}
            </text>
          ))}
          <rect
            x={pad.left - 6}
            y={pad.top}
            width={plotW + 12}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onTouchStart={onMove}
            onTouchMove={onMove}
          />
        </svg>
      )}
      {a && (
        <Tip left={x(active)} top={pad.top - 4} width={width}>
          <strong>{a.tipLabel || a.label}</strong>
          {series.map((s) => (
            <span key={s.key}>
              <span className="ch-swatch ch-swatch--line" style={{ '--c': s.color }} aria-hidden="true" />
              {num(a[s.key])} {s.unit || s.label.toLowerCase()}
            </span>
          ))}
        </Tip>
      )}
    </div>
  )
}

/** Single-series vertical bars. `bars` is [{ label, tipLabel, value }]. */
export function BarChart({ bars, color = 'var(--s1)', height = 180, unit = '', ariaLabel, labelEvery }) {
  const [ref, width] = useWidth()
  const [active, setActive] = useState(null)
  const pad = { top: 10, right: 4, bottom: 26, left: 34 }
  const plotW = Math.max(0, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value || 0)))
  const slot = bars.length ? plotW / bars.length : 0
  const gap = slot > 14 ? Math.min(10, slot * 0.25) : slot > 6 ? 2 : 1
  const barW = Math.max(1, slot - gap)
  const y = (v) => pad.top + plotH - (v / max) * plotH
  const every = labelEvery || Math.max(1, Math.ceil(bars.length / Math.max(1, Math.floor(plotW / 56))))
  const a = active == null ? null : bars[active]

  return (
    <div className="ch-plot" ref={ref} onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {[0, max / 2, max].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="ch-grid" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="ch-axis">
                {num(t)}
              </text>
            </g>
          ))}
          {bars.map((b, i) => {
            const bx = pad.left + i * slot + gap / 2
            const h = Math.max(0, ((b.value || 0) / max) * plotH)
            return (
              <g key={b.label + i}>
                {h > 0 && (
                  <path
                    d={barPath(bx, pad.top + plotH - h, barW, h)}
                    fill={color}
                    className={active === i ? 'ch-bar is-active' : 'ch-bar'}
                  />
                )}
                {(i % every === 0 || i === bars.length - 1) && (bars.length - 1 - i >= every || i === bars.length - 1) && (
                  <text x={bx + barW / 2} y={height - 6} textAnchor="middle" className="ch-axis">
                    {b.label}
                  </text>
                )}
                <rect
                  x={pad.left + i * slot}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onTouchStart={() => setActive(i)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {a && (
        <Tip left={pad.left + active * slot + slot / 2} top={Math.max(0, y(a.value || 0) - 8)} width={width}>
          <strong>{a.tipLabel || a.label}</strong>
          <span>
            {num(a.value)} {unit}
          </span>
        </Tip>
      )}
    </div>
  )
}

/** Share of a whole. `slices` is [{ key, label, value, color }]. */
export function Donut({ slices, unit, size = 150 }) {
  const [active, setActive] = useState(null)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const gapLen = slices.filter((s) => s.value > 0).length > 1 ? 2 : 0
  let offset = 0
  const shown = active == null ? null : slices[active]

  return (
    <div className="ch-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth="18" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * c
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === i ? 22 : 18}
                strokeDasharray={`${Math.max(0, len - gapLen)} ${c}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ transition: 'stroke-width .15s' }}
              />
            )
            offset += len
            return el
          })}
        <text x="50%" y="47%" textAnchor="middle" className="ch-donut__value">
          {num(shown ? shown.value : total)}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="ch-donut__label">
          {shown ? shown.label : `total ${unit}`}
        </text>
      </svg>
      <ul className="ch-donut__legend">
        {slices.map((s, i) => (
          <li key={s.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <span className="ch-swatch" style={{ '--c': s.color }} aria-hidden="true" />
            <span className="ch-donut__name">{s.label}</span>
            <span className="ch-donut__num">
              {num(s.value)}
              <span className="ch-donut__pct">{total ? ` · ${Math.round((s.value / total) * 100)}%` : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Horizontal stacked bars of two parts, e.g. published vs hidden. */
export function SplitBars({ rows, parts }) {
  return (
    <ul className="ch-split">
      {rows.map((r) => {
        const total = parts.reduce((s, p) => s + (r[p.key] || 0), 0)
        return (
          <li key={r.label}>
            <span className="ch-split__label">{r.label}</span>
            <span className="ch-split__value">
              {num(r[parts[0].key])}
              <span className="ch-split__of"> / {num(total)}</span>
            </span>
            <span className="ch-split__bar" aria-hidden="true">
              {parts.map((p) =>
                r[p.key] > 0 ? (
                  <span
                    key={p.key}
                    title={`${num(r[p.key])} ${p.label.toLowerCase()}`}
                    style={{ flexGrow: r[p.key], background: p.color }}
                  />
                ) : null,
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
