import { Link } from 'react-router-dom'
import LegalPage, { Section } from './LegalPage'
import { openPrivacySettings, usePrivacyChoices } from '../site/privacyChoices'

const SECTIONS = [
  { id: 'summary', title: 'In short' },
  { id: 'list', title: 'Everything the website stores' },
  { id: 'statistics', title: 'Visit statistics' },
  { id: 'third-party', title: 'Other websites' },
  { id: 'choices', title: 'Changing your choices' },
]

export default function CookiePolicy() {
  const choices = usePrivacyChoices()
  return (
    <LegalPage
      title="Cookie Policy"
      sections={SECTIONS}
      intro={<p>This page lists every cookie and similar technology the Katoto Project website uses, and why.</p>}
    >
      <Section id="summary" title="In short">
        <ul>
          <li>Visitors get no cookies.</li>
          <li>The website stores one small setting in your browser: your privacy choices, so it doesn’t ask on every page.</li>
          <li>Katoto officers who sign in to the admin area get one sign-in cookie.</li>
          <li>There are no advertising, social media, or third-party analytics cookies, and no embedded content from other websites.</li>
        </ul>
      </Section>

      <Section id="list" title="Everything the website stores">
        <div className="legal__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Who</th>
                <th scope="col">Purpose</th>
                <th scope="col">How long</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">katoto-privacy-choices</th>
                <td>Browser storage (localStorage), essential</td>
                <td>All visitors who make a choice</td>
                <td>Remembers whether you allowed visit statistics, the version of the choices, and when you saved them.</td>
                <td>Until you change it or clear your browser data</td>
              </tr>
              <tr>
                <th scope="row">katoto_admin (__Host-katoto_admin on the live site)</th>
                <td>Cookie, essential</td>
                <td>Katoto officers who sign in</td>
                <td>Keeps an officer signed in to the admin area. It can’t be read by scripts and is only sent to this website.</td>
                <td>8 hours, or until the officer signs out</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="statistics" title="Visit statistics">
        <p>
          If you allow it, the website counts page views and clicks on the volunteer, contact, and document links. This
          uses no cookies and stores nothing in your browser: the count is made on Katoto’s own server, and no outside
          analytics company is involved. It is off until you allow it. See the <Link to="/privacy-policy#collect">Privacy Policy</Link>{' '}
          for exactly what is recorded.
        </p>
      </Section>

      <Section id="third-party" title="Other websites">
        <p>
          The website loads nothing from other websites: its fonts and images are served from Katoto’s own server. When you
          click a link to Facebook, or choose Gmail, Outlook, or Yahoo Mail to send an email, you go to that service, and its
          own cookie policy applies there.
        </p>
      </Section>

      <Section id="choices" title="Changing your choices">
        <p>
          Your current choice: visit statistics are{' '}
          <strong>{choices === null ? 'off (no choice made yet)' : choices.statistics ? 'allowed' : 'not allowed'}</strong>.
        </p>
        <p>
          <button type="button" className="btn" onClick={openPrivacySettings}>
            Open privacy settings
          </button>
        </p>
        <p>
          You can also delete the stored setting by clearing this website’s data in your browser. You will then be asked
          again.
        </p>
      </Section>
    </LegalPage>
  )
}
