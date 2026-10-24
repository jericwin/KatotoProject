import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  HandHeart,
  Images,
  KeyRound,
  Newspaper,
  Upload,
  Info,
  Database,
  MessageSquare,
  Landmark,
  Users,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../AdminApp'
import { PageHeader, Loading, ErrorState, useAsync } from '../ui'
import { LineChart, BarChart, Donut, SplitBars, Legend } from '../charts'
import '../overview.css'

// SQL timestamps are UTC "YYYY-MM-DD HH:MM:SS".
const sqlDate = (s) => (s ? new Date(`${s.replace(' ', 'T')}Z`) : null)
const fmtDateTime = (s) => {
  const d = sqlDate(s)
  return d && !isNaN(d.getTime()) ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never'
}
const dayLabel = (day, opts = { month: 'short', day: 'numeric' }) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, opts)
const num = (n) => (typeof n === 'number' ? n.toLocaleString() : Number(n || 0).toLocaleString())

function ago(s) {
  const d = sqlDate(s)
  if (!d) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Overview() {
  const { user } = useAuth()
  const { status, data, error, reload } = useAsync(() => api('/admin/overview'), [])

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.username ?? 'admin'}`}
        description={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      >
        <a href="/" target="_blank" rel="noopener noreferrer" className="a-btn a-btn--ghost">
          <ExternalLink aria-hidden="true" /> View website
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      </PageHeader>
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="ov">
          <Attention data={data} />
          <VisitStats />

          <section className="ov-section" aria-labelledby="ov-content">
            <h2 id="ov-content" className="a-h2">
              Website content
            </h2>
            <dl className="a-stats">
              <StatTile to="albums" label="Photo albums" value={data.albums} note={`${data.publishedAlbums} published`} />
              <StatTile to="albums" label="Photos" value={data.photos} note={`${data.publicPhotos} visible on the site`} />
              <StatTile to="news" label="News items" value={data.news} note={`${data.publishedNews} published`} />
              <StatTile to="foi" label="FOI posts" value={data.foi} note={`${data.publishedFoi} published`} />
              <StatTile to="messages" label="Messages" value={data.messages} note={`${data.unreadMessages} unread`} />
              <StatTile
                to="content"
                label="Site text"
                value={data.hasUnpublishedChanges ? 'Draft' : 'Live'}
                word
                note={`Last published ${fmtDateTime(data.contentPublishedAt)}`}
              />
            </dl>
          </section>

          <div className="ov-grid2">
            <ContentStatus data={data} />
            <MessagesTrend data={data} />
          </div>

          <div className="ov-columns">
            <section className="a-card ov-section" aria-labelledby="ov-recent">
              <h2 id="ov-recent" className="a-h2">
                Recent changes
              </h2>
              {(data?.recent || []).length === 0 ? (
                <p className="a-muted">Nothing has been changed yet.</p>
              ) : (
                <ol className="ov-activity">
                  {(data?.recent || []).map((r, i) => (
                    <li key={i}>
                      <ActivityIcon kind={r.kind} />
                      <Link to={`/admin/dashboard/${r.to}`}>{r.text}</Link>
                      <time dateTime={sqlDate(r.at)?.toISOString()} title={fmtDateTime(r.at)}>
                        {ago(r.at)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="ov-section" aria-labelledby="ov-manage">
              <h2 id="ov-manage" className="a-h2">
                Quick actions
              </h2>
              <ul className="a-quick a-quick--stack">
                {[
                  { to: 'albums', icon: Upload, title: 'Add photos', body: 'Create an album or upload to an existing one.' },
                  { to: 'news', icon: Newspaper, title: 'Post an update', body: 'Add, edit, reorder, or hide timeline entries.' },
                  { to: 'foi', icon: Landmark, title: 'Post an FOI report', body: 'Financial reports, audits, and announcements with files.' },
                  { to: 'people', icon: Users, title: 'Officers & committees', body: 'Officers, barangay coordinators, and committee heads.' },
                  { to: 'volunteer', icon: HandHeart, title: 'Call for volunteers', body: 'Qualifications, how to apply, and the Apply link.' },
                  { to: 'content', icon: FileText, title: 'Edit site text', body: 'Introduction, About text, and pillar descriptions.' },
                ].map(({ to, icon: Icon, title, body }) => (
                  <li key={title}>
                    <Link to={`/admin/dashboard/${to}`}>
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{title}</strong>
                        <span>{body}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className="a-quick__arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <details className="a-help ov-help">
            <summary>How publishing works</summary>
            <ul>
              <li>
                <strong>Site text</strong> (introduction, volunteers, contact): saved as a draft. Use <em>Preview</em> to
                check it, then <em>Publish</em> in the top bar.
              </li>
              <li>
                <strong>Albums and news</strong>: each has its own Published switch and goes live as soon as it is marked
                published.
              </li>
            </ul>
          </details>
        </div>
      )}
    </>
  )
}

function StatTile({ to, label, value, note, word }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={word ? 'a-stats__word' : undefined}>{value}</dd>
      <dd className="a-stats__note">
        {note} · <Link to={`/admin/dashboard/${to}`}>Manage</Link>
      </dd>
    </div>
  )
}

function ActivityIcon({ kind }) {
  const Icon = { photos: Images, album: Images, news: Newspaper, publish: CheckCircle2, draft: FileText, account: KeyRound, foi: Landmark }[kind] || Info
  return <Icon aria-hidden="true" className="ov-activity__icon" />
}

// Things worth doing, each derived from the stored records.
function Attention({ data }) {
  const items = []
  if (data.persistentStorage === false)
    items.push({
      tone: 'warn',
      text: 'This deployment keeps data in temporary server storage, so counts and uploads can reset when the server restarts. Numbers here only cover data saved since then. Connect a permanent database before relying on them.',
      icon: Database,
    })
  if (data.mustChangePassword)
    items.push({ tone: 'warn', text: 'You’re still using the initial password. Change it before the site goes public.', to: 'account', action: 'Change password' })
  if (data.openPrivacyRequests)
    items.push({
      tone: 'warn',
      text: `${data.openPrivacyRequests} privacy request${data.openPrivacyRequests === 1 ? ' is' : 's are'} waiting to be handled.`,
      to: 'privacy',
      action: 'Handle',
    })
  if (data.unreadMessages)
    items.push({
      tone: 'warn',
      text: `${data.unreadMessages} unread message${data.unreadMessages === 1 ? '' : 's'} from the website’s contact form.`,
      to: 'messages',
      action: 'Read',
    })
  if (data.hasUnpublishedChanges)
    items.push({ tone: 'warn', text: 'Site text has unpublished changes. Visitors still see the previous version.', to: 'content', action: 'Review' })
  if (!data.volunteerApplyUrl)
    items.push({ tone: 'warn', text: 'The volunteer “Apply” link isn’t set, so visitors see a placeholder message.', to: 'volunteer', action: 'Set it up' })
  if (data.unpublishedAlbumsWithPhotos)
    items.push({
      tone: 'info',
      text: `${data.unpublishedAlbumsWithPhotos} album${data.unpublishedAlbumsWithPhotos === 1 ? ' has' : 's have'} photos but ${data.unpublishedAlbumsWithPhotos === 1 ? 'isn’t' : 'aren’t'} published.`,
      to: 'albums',
      action: 'Open albums',
    })
  if (data.emptyAlbums)
    items.push({ tone: 'info', text: `${data.emptyAlbums} album${data.emptyAlbums === 1 ? ' is' : 's are'} empty.`, to: 'albums', action: 'Add photos' })
  if (data.publicPhotosMissingAlt)
    items.push({
      tone: 'info',
      text: `${data.publicPhotosMissingAlt} published photo${data.publicPhotosMissingAlt === 1 ? ' has' : 's have'} no image description for screen-reader users.`,
      to: 'albums',
      action: 'Add descriptions',
    })

  if (items.length === 0)
    return (
      <div className="ov-allset">
        <CheckCircle2 aria-hidden="true" /> Everything is published and up to date.
      </div>
    )
  return (
    <section className="a-card ov-attention" aria-labelledby="ov-attention">
      <h2 id="ov-attention" className="a-h2">
        Needs attention <span className="a-badge">{items.length}</span>
      </h2>
      <ul>
        {items.map((it) => (
          <li key={it.text} className={`ov-attention__item ov-attention__item--${it.tone}`}>
            {it.icon ? <it.icon aria-hidden="true" /> : it.tone === 'warn' ? <AlertTriangle aria-hidden="true" /> : <Info aria-hidden="true" />}
            <span>{it.text}</span>
            {it.to && (
              <Link to={`/admin/dashboard/${it.to}`} className="a-btn a-btn--sm a-btn--ghost">
                {it.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}


// --- Content & messages charts --------------------------------------------------
const PUBLISH_PARTS = [
  { key: 'live', label: 'Published', color: 'var(--s1)' },
  { key: 'hidden', label: 'Not published', color: 'var(--neutral)' },
]

function ContentStatus({ data }) {
  const rows = [
    { label: 'Albums', live: data.publishedAlbums, hidden: data.albums - data.publishedAlbums },
    { label: 'Photos', live: data.publicPhotos, hidden: data.photos - data.publicPhotos },
    { label: 'News items', live: data.publishedNews, hidden: data.news - data.publishedNews },
    { label: 'FOI posts', live: data.publishedFoi, hidden: data.foi - data.publishedFoi },
  ]
  return (
    <section className="a-card ov-panel" aria-labelledby="ov-status">
      <div className="ov-panel__head">
        <h2 id="ov-status" className="a-h2">
          What visitors can see
        </h2>
        <Legend series={PUBLISH_PARTS} />
      </div>
      <SplitBars rows={rows} parts={PUBLISH_PARTS} />
    </section>
  )
}

function MessagesTrend({ data }) {
  const weekly = data.messagesWeekly || []
  const total = weekly.reduce((s, w) => s + w.messages, 0)
  const topics = data.messageTopics || []
  const maxTopic = Math.max(1, ...topics.map((t) => t.n))
  return (
    <section className="a-card ov-panel" aria-labelledby="ov-msgs">
      <div className="ov-panel__head">
        <h2 id="ov-msgs" className="a-h2">
          Contact messages
        </h2>
        <span className="ov-panel__meta">
          <MessageSquare aria-hidden="true" /> {num(total)} in the last 12 weeks
        </span>
      </div>
      <p className="ov-chart__title">Messages per week</p>
      <BarChart
        bars={weekly.map((w) => ({
          label: dayLabel(w.week),
          tipLabel: `Week of ${dayLabel(w.week, { month: 'short', day: 'numeric', year: 'numeric' })}`,
          value: w.messages,
        }))}
        color="var(--s2)"
        unit="messages"
        height={160}
        ariaLabel={`Bar chart of contact messages per week for the last 12 weeks, ${total} in total.`}
      />
      {topics.length > 0 && (
        <div className="ov-breakdown ov-topics">
          <h3>By topic (all stored messages)</h3>
          <ul>
            {topics.map((t) => (
              <li key={t.topic}>
                <span className="ov-breakdown__label">{t.topic}</span>
                <span className="ov-breakdown__value">{num(t.n)}</span>
                <span className="ov-breakdown__bar" aria-hidden="true">
                  <span style={{ width: `${(t.n / maxTopic) * 100}%`, background: 'var(--s2)' }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// --- Visit statistics ---------------------------------------------------------
const RANGES = [7, 30, 90]
const ACTION_LABELS = {
  apply: 'Volunteer “Apply” clicks',
  facebook: 'Facebook link clicks',
  email: 'Email link clicks',
  phone: 'Phone number taps',
  foi: 'FOI documents opened',
}
const DEVICES = [
  { key: 'mobile', label: 'Phone', color: 'var(--s1)' },
  { key: 'desktop', label: 'Computer', color: 'var(--s2)' },
  { key: 'tablet', label: 'Tablet', color: 'var(--s3)' },
]
const TREND_SERIES = [
  { key: 'views', label: 'Page views', unit: 'page views', color: 'var(--s1)', shape: 'line' },
  { key: 'visitors', label: 'Visitors', unit: 'visitors', color: 'var(--s2)', shape: 'line' },
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Change({ current, previous, range }) {
  if (!previous) return <dd className="ov-change">{current ? `No data for the ${range} days before` : ' '}</dd>
  const pct = Math.round(((current - previous) / previous) * 100)
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <dd className={`ov-change ${pct >= 0 ? 'is-up' : 'is-down'}`}>
      <Icon aria-hidden="true" /> {pct >= 0 ? '+' : ''}
      {pct}% vs previous {range} days
    </dd>
  )
}

function VisitStats() {
  const [range, setRange] = useState(30)
  const { status, data, error, reload } = useAsync(() => api(`/admin/stats?range=${range}`), [range])
  const shown = data ?? null

  return (
    <section className="a-card ov-visits" aria-labelledby="ov-visits" aria-busy={status === 'loading'}>
      <div className="ov-visits__head">
        <div>
          <h2 id="ov-visits" className="a-h2">
            Website visits
          </h2>
          <p className="a-muted">
            {shown ? `${dayLabel(shown.from, { month: 'short', day: 'numeric', year: 'numeric' })} – today` : ' '}
          </p>
        </div>
        <div className="a-seg" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {r} days
            </button>
          ))}
        </div>
      </div>

      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {!shown && status === 'loading' && <Loading label="Loading statistics…" />}
      {shown && (
        <div className={status === 'loading' ? 'ov-visits__body is-stale' : 'ov-visits__body'}>
          <dl className="ov-kpis">
            <div>
              <dt>Visitors</dt>
              <dd>{num(shown.visitors)}</dd>
              <Change current={shown.visitors} previous={shown.previous.visitors} range={shown.range} />
            </div>
            <div>
              <dt>Page views</dt>
              <dd>{num(shown.views)}</dd>
              <Change current={shown.views} previous={shown.previous.views} range={shown.range} />
            </div>
            <div>
              <dt>Pages per visitor</dt>
              <dd>{shown.visitors ? (shown.views / shown.visitors).toFixed(1) : '–'}</dd>
              <dd className="ov-change">average in this period</dd>
            </div>
            <div>
              <dt>Today</dt>
              <dd>{num(shown.today.visitors)}</dd>
              <dd className="ov-change">
                {num(shown.today.views)} page view{shown.today.views === 1 ? '' : 's'}
              </dd>
            </div>
            <div>
              <dt>Apply clicks</dt>
              <dd>{num(shown.actions.apply)}</dd>
              <dd className="ov-change">on the volunteer buttons</dd>
            </div>
          </dl>

          {shown.allTime.views === 0 ? (
            <div className="ov-empty">
              <Info aria-hidden="true" />
              <p>
                No visits recorded yet. Counting starts when people open the public website and allow statistics in
                their privacy choices. Your own visits aren’t counted while you’re signed in.
              </p>
            </div>
          ) : (
            <>
              <figure className="ov-chart">
                <div className="ov-panel__head">
                  <figcaption className="ov-chart__title">Daily traffic</figcaption>
                  <Legend series={TREND_SERIES} />
                </div>
                <LineChart
                  points={shown.daily.map((d) => ({
                    ...d,
                    label: dayLabel(d.day),
                    tipLabel: dayLabel(d.day, { weekday: 'short', month: 'short', day: 'numeric' }),
                  }))}
                  series={TREND_SERIES}
                  ariaLabel="Line chart of page views and visitors per day. The table below lists the same numbers."
                />
                <DailyTable daily={shown.daily} />
              </figure>

              <div className="ov-breakdowns">
                <div className="ov-breakdown">
                  <h3>Devices</h3>
                  <Donut
                    slices={DEVICES.map((d) => ({
                      ...d,
                      value: shown.devices.find((x) => x.device === d.key)?.visitors || 0,
                    }))}
                    unit="visitors"
                  />
                </div>
                <div className="ov-breakdown">
                  <h3>Busiest days of the week</h3>
                  <BarChart
                    bars={weekdayAverages(shown.daily).map((w) => ({ label: w.label, tipLabel: `${w.label} (average)`, value: w.value }))}
                    color="var(--s3)"
                    unit="visitors per day"
                    height={150}
                    labelEvery={1}
                    ariaLabel="Bar chart of average visitors per weekday."
                  />
                </div>
                <Breakdown
                  title="Where visitors came from"
                  rows={shown.referrers.map((r) => ({ label: r.source || 'Direct or unknown', value: r.views }))}
                  unit="views"
                />
                <Breakdown
                  title="Clicks on links"
                  rows={Object.entries(ACTION_LABELS).map(([k, label]) => ({ label, value: shown.actions[k] }))}
                  unit="clicks"
                  color="var(--s4)"
                  keepZero
                />
              </div>
            </>
          )}
          <p className="ov-note">
            Only visitors who allowed statistics in their privacy choices are counted, so these numbers are lower than
            actual visits. Counted on this server without cookies or stored IP addresses. A visitor is counted once per
            day, so “Visitors” adds up daily visitors. Bots, browsers with Do Not Track, and signed-in admins aren’t
            counted. Days follow {shown.timeZone.replace('_', ' ')} time.
          </p>
        </div>
      )}
    </section>
  )
}

// Average visitors per weekday over the selected range (each weekday's total
// divided by how many of that weekday the range contains).
function weekdayAverages(daily) {
  const sums = WEEKDAYS.map(() => ({ total: 0, days: 0 }))
  for (const d of daily) {
    const i = (new Date(`${d.day}T12:00:00Z`).getUTCDay() + 6) % 7
    sums[i].total += d.visitors
    sums[i].days++
  }
  return WEEKDAYS.map((label, i) => ({ label, value: sums[i].days ? Math.round((sums[i].total / sums[i].days) * 10) / 10 : 0 }))
}

function Breakdown({ title, rows, unit, keepZero, color }) {
  const list = keepZero ? rows : rows.filter((r) => r.value > 0)
  const max = Math.max(1, ...list.map((r) => r.value))
  return (
    <div className="ov-breakdown">
      <h3>{title}</h3>
      {list.length === 0 ? (
        <p className="a-muted">No data in this period.</p>
      ) : (
        <ul>
          {list.map((r) => (
            <li key={r.label}>
              <span className="ov-breakdown__label">{r.label}</span>
              <span className="ov-breakdown__value">
                {num(r.value)} <span className="visually-hidden">{unit}</span>
              </span>
              <span className="ov-breakdown__bar" aria-hidden="true">
                <span style={{ width: `${(r.value / max) * 100}%`, ...(color && { background: color }) }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DailyTable({ daily }) {
  return (
    <details className="ov-chart__table">
      <summary>Show as a table</summary>
      <div className="ov-chart__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Visitors</th>
              <th scope="col">Page views</th>
            </tr>
          </thead>
          <tbody>
            {[...daily].reverse().map((d) => (
              <tr key={d.day}>
                <th scope="row">{dayLabel(d.day, { weekday: 'short', month: 'short', day: 'numeric' })}</th>
                <td>{num(d.visitors)}</td>
                <td>{num(d.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
