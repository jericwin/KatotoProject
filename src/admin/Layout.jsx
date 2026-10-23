import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Images,
  HandHeart,
  FileText,
  Newspaper,
  Contact,
  KeyRound,
  LogOut,
  Menu,
  X,
  Eye,
  Upload,
  Undo2,
  ExternalLink,
  Users,
  Landmark,
  Inbox,
  ShieldCheck,
} from 'lucide-react'
import logo from '../assets/katoto-logo-sm.webp'
import { api } from './api'
import { useAuth } from './AdminApp'
import { ConfirmProvider, ToastProvider, useConfirm, useToast } from './ui'

const NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/dashboard/messages', label: 'Messages', icon: Inbox, badge: 'unread' },
  { to: '/admin/dashboard/albums', label: 'Photo albums', icon: Images },
  { to: '/admin/dashboard/volunteer', label: 'Call for volunteers', icon: HandHeart },
  { to: '/admin/dashboard/content', label: 'Site content', icon: FileText },
  { to: '/admin/dashboard/people', label: 'Officers & committees', icon: Users },
  { to: '/admin/dashboard/news', label: 'News & updates', icon: Newspaper },
  { to: '/admin/dashboard/foi', label: 'Freedom of Information', icon: Landmark },
  { to: '/admin/dashboard/contact', label: 'Contact & links', icon: Contact },
  { to: '/admin/dashboard/privacy', label: 'Privacy requests', icon: ShieldCheck },
  { to: '/admin/dashboard/account', label: 'Account & security', icon: KeyRound },
]

// Site text is edited as a draft, previewed, then published in one step.
const ContentContext = createContext(null)
export const useContentDraft = () => useContext(ContentContext)

function ContentProvider({ children }) {
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  const reload = useCallback(async () => {
    setError(null)
    try {
      setRow(await api('/admin/content'))
    } catch (e) {
      setError(e)
    }
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  const save = async (section, data) => {
    const next = await api(`/admin/content/${section}`, { method: 'PUT', body: { data } })
    setRow(next)
    return next
  }
  const publish = async () => setRow(await api('/admin/content/publish', { method: 'POST' }))
  const discard = async () => setRow(await api('/admin/content/discard', { method: 'POST' }))
  return <ContentContext.Provider value={{ row, error, reload, save, publish, discard }}>{children}</ContentContext.Provider>
}

function PublishBar() {
  const { row, publish, discard } = useContentDraft()
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  if (!row) return null

  const run = async (fn, msg) => {
    setBusy(true)
    try {
      await fn()
      toast(msg)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`publish-bar ${row.hasUnpublishedChanges ? 'publish-bar--pending' : ''}`}>
      <p className="publish-bar__status">
        <span className="publish-bar__dot" aria-hidden="true" />
        {row.hasUnpublishedChanges ? 'Unpublished changes to site text' : 'Site text is published'}
      </p>
      <div className="publish-bar__actions">
        <a className="a-btn a-btn--ghost a-btn--sm" href="/?preview=1" target="_blank" rel="noopener">
          <Eye aria-hidden="true" /> Preview
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        {row.hasUnpublishedChanges && (
          <>
            <button
              type="button"
              className="a-btn a-btn--ghost a-btn--sm"
              disabled={busy}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Discard unpublished changes?',
                  message: 'All site-text edits since the last publish will be lost. This can’t be undone.',
                  confirmLabel: 'Discard changes',
                })
                if (ok) run(discard, 'Changes discarded.')
              }}
            >
              <Undo2 aria-hidden="true" /> Discard
            </button>
            <button type="button" className="a-btn a-btn--sm" disabled={busy} onClick={() => run(publish, 'Published. The website is updated.')}>
              <Upload aria-hidden="true" /> {busy ? 'Publishing…' : 'Publish'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Unread contact-form messages, refreshed on navigation and every minute.
export const MessagesContext = createContext({ unread: 0, refresh: () => {} })
function useUnreadMessages(pathname) {
  const [unread, setUnread] = useState(0)
  const refresh = useCallback(() => {
    api('/admin/messages/unread')
      .then((d) => setUnread(d.unread))
      .catch(() => {})
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh, pathname])
  useEffect(() => {
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [refresh])
  return { unread, refresh }
}

function Shell() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const messages = useUnreadMessages(location.pathname)
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="a-shell">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside className={`a-sidebar ${open ? 'is-open' : ''}`} id="admin-sidebar">
        <div className="a-sidebar__brand">
          <img src={logo} alt="Katoto Project" width="420" height="252" />
          <span>Admin</span>
        </div>
        <nav aria-label="Admin">
          <ul>
            {NAV.map(({ to, label, icon: Icon, end, badge }) => (
              <li key={to}>
                <NavLink to={to} end={end}>
                  <Icon aria-hidden="true" /> {label}
                  {badge === 'unread' && messages.unread > 0 && (
                    <span className="a-nav-badge">
                      {messages.unread}
                      <span className="visually-hidden"> unread</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="a-sidebar__foot">
          <a href="/" target="_blank" rel="noopener" className="a-sidebar__site">
            <ExternalLink aria-hidden="true" /> View website
          </a>
          <p className="a-sidebar__user">
            Signed in as <strong>{user?.username}</strong>
          </p>
          <button type="button" className="a-btn a-btn--ghost a-btn--block" onClick={logout}>
            <LogOut aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>
      {open && <button type="button" className="a-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className="a-main">
        <header className="a-topbar">
          <button
            type="button"
            className="a-icon-btn a-topbar__menu"
            aria-expanded={open}
            aria-controls="admin-sidebar"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
          <PublishBar />
          <button type="button" className="a-btn a-btn--ghost a-btn--sm a-topbar__logout" onClick={logout}>
            <LogOut aria-hidden="true" /> Log out
          </button>
        </header>

        {user?.mustChangePassword && location.pathname !== '/admin/dashboard/account' && (
          <div className="admin-alert admin-alert--warn a-banner" role="alert">
            <span>
              You are using the initial password. <strong>Change it before this site goes live.</strong>
            </span>
            <NavLink to="/admin/dashboard/account" className="a-btn a-btn--sm">
              Change password
            </NavLink>
          </div>
        )}

        <main id="admin-main" className="a-content" tabIndex={-1}>
          <MessagesContext.Provider value={messages}>
            <Outlet />
          </MessagesContext.Provider>
        </main>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <ContentProvider>
          <Shell />
        </ContentProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
