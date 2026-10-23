import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the Express API runs on PORT (default 8787); Vite proxies
// /api and /uploads to it so the app and API share one origin.
const api = `http://localhost:${process.env.PORT || 8787}`
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const proxy = {
  '/api': { target: api, xfwd: true },
  '/uploads': { target: api },
}

export default defineConfig({
  plugins: [react()],
  // Only VITE_-prefixed variables reach the browser bundle; never give a
  // secret that prefix.
  envPrefix: 'VITE_',
  build: {
    sourcemap: false,
  },
  server: {
    // The dev server is for this computer only. Don't put it behind a public
    // tunnel: use the production server (npm run build && npm start) instead.
    host: 'localhost',
    fs: {
      strict: true,
      // The dev server may serve only the front-end sources. Everything else in
      // the project folder (server code, server-data with the database and
      // uploads, scripts, docs, the organization's original files) is refused.
      allow: [path.join(root, 'src'), path.join(root, 'public'), path.join(root, 'node_modules'), path.join(root, 'index.html')],
      deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/server-data/**', '**/server/**', '**/scripts/**', '**/docs/**', '*.db', '*.pdf'],
    },
    proxy,
  },
  preview: {
    host: 'localhost',
    proxy,
  },
})
