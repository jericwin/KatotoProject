import { db } from './db.js'
import { defaultContent } from '../src/data/siteDefaults.js'
import { pillarText } from '../src/data/pillarText.js'
import { text, link, email, list, done } from './validate.js'

const KEY = 'site'

export function getContentRow() {
  const row = db.prepare('SELECT * FROM content WHERE key = ?').get(KEY)
  return {
    draft: JSON.parse(row.draft),
    published: JSON.parse(row.published),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    hasUnpublishedChanges: row.draft !== row.published,
  }
}

export function getPublished() {
  return JSON.parse(db.prepare('SELECT published FROM content WHERE key = ?').get(KEY).published)
}
export function getDraft() {
  return JSON.parse(db.prepare('SELECT draft FROM content WHERE key = ?').get(KEY).draft)
}

export function seedContent() {
  const row = db.prepare('SELECT draft, published FROM content WHERE key = ?').get(KEY)
  if (!row) {
    const json = JSON.stringify(defaultContent)
    db.prepare("INSERT INTO content (key, draft, published, published_at) VALUES (?, ?, ?, datetime('now'))").run(KEY, json, json)
    return
  }
  // Sections added in later versions: fill them in from the defaults without
  // touching anything an admin has edited.
  const fill = (json) => {
    const doc = JSON.parse(json)
    let changed = false
    for (const [name, value] of Object.entries(defaultContent)) {
      if (doc[name] === undefined) {
        doc[name] = value
        changed = true
      }
    }
    return changed ? JSON.stringify(doc) : json
  }
  const draft = fill(row.draft)
  const published = fill(row.published)
  if (draft !== row.draft || published !== row.published)
    db.prepare('UPDATE content SET draft = ?, published = ? WHERE key = ?').run(draft, published, KEY)
}

// One validator per editable section of the content document.
const sections = {
  hero(input) {
    const errors = {}
    return done(errors, { lede: text(input.lede, 'lede', { max: 600, required: true, errors }) })
  },
  about(input) {
    const errors = {}
    return done(errors, {
      intro: text(input.intro, 'intro', { max: 900, required: true, errors }),
      paragraphs: list(input.paragraphs, 'paragraphs', { max: 4, min: 1, errors }, (p, f) =>
        text(p, f, { max: 1200, required: true, errors }),
      ),
    })
  },
  pillars(input) {
    const errors = {}
    const out = {}
    for (const p of pillarText) {
      const v = input?.[p.id] || {}
      out[p.id] = {
        summary: text(v.summary, `${p.id}.summary`, { max: 900, required: true, errors }),
        caption: text(v.caption, `${p.id}.caption`, { max: 200, errors }),
      }
    }
    return done(errors, out)
  },
  volunteer(input) {
    const errors = {}
    return done(errors, {
      eyebrow: text(input.eyebrow, 'eyebrow', { max: 60, errors }),
      heading: text(input.heading, 'heading', { max: 140, required: true, errors }),
      intro: text(input.intro, 'intro', { max: 900, required: true, errors }),
      qualifications: list(input.qualifications, 'qualifications', { max: 12, min: 1, errors }, (q, f) =>
        text(q, f, { max: 300, required: true, errors }),
      ),
      stepsTitle: text(input.stepsTitle, 'stepsTitle', { max: 80, errors }),
      steps: list(input.steps, 'steps', { max: 8, errors }, (s, f) => ({
        title: text(s?.title, `${f}.title`, { max: 120, required: true, errors }),
        body: text(s?.body, `${f}.body`, { max: 500, errors }),
      })),
      applyLabel: text(input.applyLabel, 'applyLabel', { max: 60, required: true, errors }),
      applyUrl: link(input.applyUrl, 'applyUrl', { errors }),
      applyNote: text(input.applyNote, 'applyNote', { max: 500, errors }),
      secondaryLabel: text(input.secondaryLabel, 'secondaryLabel', { max: 60, errors }),
      secondaryUrl: link(input.secondaryUrl, 'secondaryUrl', { errors }),
    })
  },
  contact(input) {
    const errors = {}
    const phoneDisplay = text(input.phoneDisplay, 'phoneDisplay', { max: 40, errors })
    if (phoneDisplay && !/^[0-9+\s()-]{7,}$/.test(phoneDisplay)) errors.phoneDisplay = 'Use digits, spaces, and + only.'
    const facebookUrl = link(input.facebookUrl, 'facebookUrl', { required: true, errors })
    if (facebookUrl && !/^https:\/\/(www\.|m\.)?facebook\.com\//i.test(facebookUrl))
      errors.facebookUrl = 'Use the full https://www.facebook.com/… page link.'
    return done(errors, {
      email: email(input.email, 'email', { errors }),
      phoneDisplay,
      facebookUrl,
      address: text(input.address, 'address', { max: 200, required: true, errors }),
    })
  },
  people(input) {
    const errors = {}
    const committees = {}
    for (const p of pillarText) {
      const v = input?.committees?.[p.id] || {}
      committees[p.id] = {
        head: text(v.head, `committees.${p.id}.head`, { max: 120, errors }),
        assistant: text(v.assistant, `committees.${p.id}.assistant`, { max: 120, errors }),
      }
    }
    return done(errors, {
      term: text(input.term, 'term', { max: 80, errors }),
      groups: list(input.groups, 'groups', { max: 12, errors }, (g, f) => ({
        name: text(g?.name, `${f}.name`, { max: 80, required: true, errors }),
        members: list(g?.members, `${f}.members`, { max: 20, min: 1, errors }, (m, mf) => ({
          role: text(m?.role, `${mf}.role`, { max: 100, required: true, errors }),
          name: text(m?.name, `${mf}.name`, { max: 120, required: true, errors }),
        })),
      })),
      coordinators: list(input.coordinators, 'coordinators', { max: 30, errors }, (c, f) => ({
        area: text(c?.area, `${f}.area`, { max: 60, required: true, errors }),
        name: text(c?.name, `${f}.name`, { max: 120, required: true, errors }),
      })),
      committees,
    })
  },
  legal(input) {
    const errors = {}
    const dpoEmail = text(input.dpoEmail, 'dpoEmail', { max: 200, errors })
    if (dpoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dpoEmail)) errors.dpoEmail = 'Enter a valid email address.'
    return done(errors, { dpoName: text(input.dpoName, 'dpoName', { max: 120, errors }), dpoEmail })
  },
  donation(input) {
    const errors = {}
    return done(errors, {
      channel: text(input.channel, 'channel', { max: 40, errors }),
      number: text(input.number, 'number', { max: 40, errors }),
      accountName: text(input.accountName, 'accountName', { max: 80, errors }),
    })
  },
}

export const SECTION_NAMES = Object.keys(sections)

export function saveDraftSection(name, input) {
  const validate = sections[name]
  if (!validate) throw Object.assign(new Error('Unknown section.'), { status: 404 })
  const value = validate(input || {})
  const draft = getDraft()
  draft[name] = value
  db.prepare("UPDATE content SET draft = ?, updated_at = datetime('now') WHERE key = ?").run(JSON.stringify(draft), KEY)
  return getContentRow()
}

export function publishDraft() {
  db.prepare("UPDATE content SET published = draft, published_at = datetime('now') WHERE key = ?").run(KEY)
  return getContentRow()
}

export function discardDraft() {
  db.prepare("UPDATE content SET draft = published, updated_at = datetime('now') WHERE key = ?").run(KEY)
  return getContentRow()
}
