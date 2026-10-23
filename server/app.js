import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import helmet from 'helmet'
import multer from 'multer'
import { config } from './config.js'
import './db.js'
import { seed } from './seed.js'
import { preflight } from './preflight.js'
import publicRoutes from './routes/public.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'

await seed()
await import('./retention.js')
preflight()

export const app = express()
app.disable('x-powered-by')
// Which proxies may report the visitor's IP (X-Forwarded-For), used by the
// rate limits. Default: only a proxy on this machine (Vite in development,
// a local reverse proxy or cloudflared). Behind a hosting platform's proxy,
// set TRUST_PROXY to the number of proxy hops (usually 1).
app.set('trust proxy', config.trustProxy)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction,
  }),
)

// Browser features the site never uses are switched off for every page.
app.use((req, res, next) => {
  res.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()',
  )
  next()
})

app.use('/api', express.json({ limit: '200kb' }))
app.use('/api/public', publicRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

app.use(
  '/uploads',
  express.static(config.uploadsDir, { immutable: true, maxAge: '365d', index: false, dotfiles: 'deny' }),
)
app.use('/uploads', (req, res) => res.status(404).end())

// Production: serve the built React app, with client-side routing fallback (when standalone).
if (fs.existsSync(config.distDir) && !config.isVercel) {
  app.use(express.static(config.distDir, { index: false, maxAge: '1h' }))
  // Pages the React app has; anything else gets a real 404 status.
  const PAGES = new Set(['/', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/data-deletion'])
  app.get('/{*splat}', (req, res) => {
    res.set('Cache-Control', 'no-cache')
    const page = req.path.replace(/\/+$/, '') || '/'
    if (req.path.startsWith('/admin')) res.set('X-Robots-Tag', 'noindex, nofollow')
    else if (!PAGES.has(page)) res.status(404)
    res.sendFile(path.join(config.distDir, 'index.html'))
  })
}

// Errors: report validation/user errors plainly; never leak internals.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Each image must be under ${config.maxUploadMb} MB.`
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Upload at most 20 images at a time.'
          : 'The upload could not be processed.'
    return res.status(400).json({ error: msg })
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large.' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' })
  const status = err.status && err.status < 500 ? err.status : 500
  if (status === 500) console.error(`[error] ${req.method} ${req.path}:`, err.message)
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server.' : err.message, errors: err.errors })
})

export default app
