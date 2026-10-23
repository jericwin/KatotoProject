import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'
import { usePrivacyChoices, savePrivacyChoices, registerSettingsOpener } from '../site/privacyChoices'
import './PrivacyChoices.css'

// First-visit notice with equal "Accept all" / "Reject non-essential" choices,
// plus a settings dialog reachable any time from the footer. Nothing optional
// runs until a choice is made, and closing the notice is not consent.
export default function PrivacyChoices() {
  const choices = usePrivacyChoices()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statistics, setStatistics] = useState(false)
  const dialogRef = useRef(null)
  const returnFocus = useRef(null)

  useEffect(() => {
    registerSettingsOpener(() => {
      returnFocus.current = document.activeElement
      setStatistics(choices?.statistics === true)
      setSettingsOpen(true)
    })
  }, [choices])

  useEffect(() => {
    const d = dialogRef.current
    if (settingsOpen && d && !d.open) d.showModal()
  }, [settingsOpen])

  const save = (value) => {
    savePrivacyChoices({ statistics: value })
    dialogRef.current?.close()
  }

  const showBanner = choices === null && !settingsOpen

  return (
    <>
      {showBanner && (
        <section className="privacy-banner" aria-labelledby="privacy-banner-title">
          <div className="privacy-banner__text">
            <h2 id="privacy-banner-title">
              <ShieldCheck aria-hidden="true" /> Your privacy choices
            </h2>
            <p>
              This website doesn’t use advertising or tracking cookies. With your permission, it counts visits
              anonymously to help Katoto see which pages are useful. No cookies are used for this, and it stays off
              unless you allow it. <Link to="/cookie-policy">Cookie Policy</Link> ·{' '}
              <Link to="/privacy-policy">Privacy Policy</Link>
            </p>
          </div>
          <div className="privacy-banner__actions">
            <button type="button" className="btn privacy-banner__choice" onClick={() => save(true)}>
              Accept all
            </button>
            <button type="button" className="btn privacy-banner__choice" onClick={() => save(false)}>
              Reject non-essential
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                returnFocus.current = document.activeElement
                setStatistics(false)
                setSettingsOpen(true)
              }}
            >
              Customize
            </button>
          </div>
        </section>
      )}

      <dialog
        ref={dialogRef}
        className="privacy-settings"
        aria-labelledby="privacy-settings-title"
        onClose={() => {
          setSettingsOpen(false)
          returnFocus.current?.focus?.()
        }}
      >
        {settingsOpen && (
          <form
            className="privacy-settings__body"
            onSubmit={(e) => {
              e.preventDefault()
              save(statistics)
            }}
          >
            <div className="privacy-settings__head">
              <h2 id="privacy-settings-title">Privacy settings</h2>
              <button type="button" className="privacy-settings__close" onClick={() => dialogRef.current?.close()}>
                <X aria-hidden="true" />
                <span className="visually-hidden">Close without saving</span>
              </button>
            </div>

            <fieldset className="privacy-settings__group">
              <legend>Essential</legend>
              <label className="privacy-settings__option">
                <input type="checkbox" checked disabled aria-describedby="ps-essential" />
                <span>Always on</span>
              </label>
              <p id="ps-essential">
                Remembers these privacy choices in your browser, and keeps Katoto’s officers signed in to the admin area.
                Visitors who don’t sign in get no cookies.
              </p>
            </fieldset>

            <fieldset className="privacy-settings__group">
              <legend>Anonymous visit statistics</legend>
              <label className="privacy-settings__option">
                <input type="checkbox" checked={statistics} onChange={(e) => setStatistics(e.target.checked)} aria-describedby="ps-stats" />
                <span>Allow</span>
              </label>
              <p id="ps-stats">
                Counts page views and clicks on the volunteer, contact, and document links, with the referring website and
                device type. No cookies, no IP address saved, and no third-party analytics. A visitor can’t be followed
                from one day to the next.
              </p>
            </fieldset>

            {choices?.savedAt && (
              <p className="privacy-settings__saved">
                Last saved {new Date(choices.savedAt).toLocaleString()}: statistics {choices.statistics ? 'allowed' : 'not allowed'}.
              </p>
            )}

            <div className="privacy-settings__actions">
              <button type="button" className="btn privacy-banner__choice" onClick={() => save(false)}>
                Reject non-essential
              </button>
              <button type="button" className="btn privacy-banner__choice" onClick={() => save(true)}>
                Accept all
              </button>
              <button type="submit" className="btn btn-ghost">
                Save my choices
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
