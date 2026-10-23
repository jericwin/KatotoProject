import { useSyncExternalStore } from 'react'
import { PRIVACY_CHOICES_VERSION } from '../data/legal'

// The visitor's privacy choices. The only optional feature is anonymous visit
// statistics, which stays off until the visitor allows it. The choice itself
// is kept in this browser (localStorage) so we don't ask on every page; it
// holds only { version, statistics, savedAt }.
const KEY = 'katoto-privacy-choices'
const listeners = new Set()
let openSettings = () => {}

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved && saved.version === PRIVACY_CHOICES_VERSION && typeof saved.statistics === 'boolean') return saved
  } catch {
    /* storage blocked or corrupted: treat as no choice */
  }
  return null
}

let current = read()

export function savePrivacyChoices({ statistics }) {
  current = { version: PRIVACY_CHOICES_VERSION, statistics: !!statistics, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* without storage the choice lasts until the page is closed */
  }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// null = not chosen yet
export const usePrivacyChoices = () => useSyncExternalStore(subscribe, () => current)

export const statisticsAllowed = () => current?.statistics === true

// The settings dialog registers itself here so any "Privacy settings" link can open it.
export const registerSettingsOpener = (fn) => {
  openSettings = fn
}
export const openPrivacySettings = () => openSettings()
