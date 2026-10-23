import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/figtree'
import '@fontsource/barlow-condensed/latin-600.css'
import './styles/global.css'
import App from './App'

// The admin app is a separate chunk, so public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))

const router = createBrowserRouter([
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<div className="admin-boot">Loading…</div>}>
        <AdminApp />
      </Suspense>
    ),
  },
  { path: '*', element: <App /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
