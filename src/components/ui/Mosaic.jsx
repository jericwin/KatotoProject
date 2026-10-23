import { useMemo } from 'react'

// The stained-glass fill of the KATOTO wordmark, reduced to a band of triangles.
const PALETTE = [
  '#e11d3c', '#f7c316', '#57256b', '#136fb2', '#16a04b',
  '#34b9cf', '#ee7d22', '#ef6aa0', '#a6ce39', '#9b59b6',
]

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export default function Mosaic({ cols = 48, rows = 2, seed = 7, className = '', style }) {
  const tris = useMemo(() => {
    const rand = rng(seed)
    const out = []
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const x0 = x * 10
        const y0 = y * 10
        const flip = rand() > 0.5
        const a = PALETTE[Math.floor(rand() * PALETTE.length)]
        const b = PALETTE[Math.floor(rand() * PALETTE.length)]
        if (flip) {
          out.push([`${x0},${y0} ${x0 + 10},${y0} ${x0},${y0 + 10}`, a])
          out.push([`${x0 + 10},${y0} ${x0 + 10},${y0 + 10} ${x0},${y0 + 10}`, b])
        } else {
          out.push([`${x0},${y0} ${x0 + 10},${y0} ${x0 + 10},${y0 + 10}`, a])
          out.push([`${x0},${y0} ${x0 + 10},${y0 + 10} ${x0},${y0 + 10}`, b])
        }
      }
    }
    return out
  }, [cols, rows, seed])

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${cols * 10} ${rows * 10}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {tris.map(([points, fill], i) => (
        <polygon key={i} points={points} fill={fill} stroke="#1f1530" strokeWidth="0.35" />
      ))}
    </svg>
  )
}
