import { Link } from 'react-router-dom'
import LegalPage, { Section, ToConfirm } from './LegalPage'
import { useSite } from '../site/SiteContext'
import { accreditation } from '../data/organization'
import { openPrivacySettings } from '../site/privacyChoices'

const SECTIONS = [
  { id: 'who', title: 'Who we are' },
  { id: 'collect', title: 'What we collect and why' },
  { id: 'not-collected', title: 'What this website does not collect' },
  { id: 'published', title: 'Information Katoto publishes' },
  { id: 'basis', title: 'Why we may use your information' },
  { id: 'sharing', title: 'Who receives your information' },
  { id: 'retention', title: 'How long we keep it' },
  { id: 'security', title: 'How we protect it' },
  { id: 'minors', title: 'Young people and minors' },
  { id: 'rights', title: 'Your rights' },
  { id: 'contact', title: 'Contact and complaints' },
  { id: 'changes', title: 'Changes to this policy' },
]

const years = (days) => (days % 365 === 0 ? `${days / 365} year${days === 365 ? '' : 's'}` : `${days} days`)

export default function PrivacyPolicy() {
  const { content, privacy } = useSite()
  const { contact, legal = {} } = content
  const email = <a href={`mailto:${contact.email}?subject=${encodeURIComponent('Privacy question')}`}>{contact.email}</a>

  return (
    <LegalPage
      title="Privacy Policy"
      sections={SECTIONS}
      intro={
        <p>
          This policy explains what personal information the Katoto Project website collects, why, who can see it, how
          long it is kept, and how you can ask us to show, correct, or delete it. It covers this website only.
        </p>
      }
    >
      <Section id="who" title="Who we are">
        <p>
          Katoto Project is a youth organization in {contact.address}. It is accredited by the {accreditation.issuer} as “
          {accreditation.registeredName}” (Organization ID {accreditation.organizationId}). Katoto Project decides how
          the information described here is used.
        </p>
        <p>
          Legal registration details: <ToConfirm>to be confirmed by Katoto Project</ToConfirm>.
        </p>
        <p>
          Data Protection Officer:{' '}
          {legal.dpoName ? (
            <>
              {legal.dpoName}
              {legal.dpoEmail && (
                <>
                  , <a href={`mailto:${legal.dpoEmail}`}>{legal.dpoEmail}</a>
                </>
              )}
              .
            </>
          ) : (
            <>
              <ToConfirm>not yet designated</ToConfirm>. Until one is named, send privacy questions to {email}.
            </>
          )}
        </p>
      </Section>

      <Section id="collect" title="What we collect and why">
        <p>The website collects personal information in these situations only:</p>
        <div className="legal__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">What</th>
                <th scope="col">Why</th>
                <th scope="col">Required?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">You send a message with the contact form</th>
                <td>Your name, email address, the topic, your message, and a record that you agreed to this policy (the wording version and the time).</td>
                <td>To read and reply to your message.</td>
                <td>Name, email, message, and agreement are required. There are no optional fields.</td>
              </tr>
              <tr>
                <th scope="row">You make a privacy request</th>
                <td>The type of request, your name, your email address, any details you add, and a log of how Katoto handled it.</td>
                <td>To confirm who you are, act on the request, and show that it was handled.</td>
                <td>Name and email are required. Details are required only for photo removal, corrections, and other questions.</td>
              </tr>
              <tr>
                <th scope="row">You allow visit statistics</th>
                <td>
                  That a page was viewed, clicks on the volunteer, contact, and document links, the name of the website
                  that sent you (for example facebook.com), your device type (phone, tablet, or computer), and the date.
                  To count a visitor once a day, the server makes a one-way code from your IP address and browser with a
                  secret that is replaced every day. The IP address itself is not saved.
                </td>
                <td>To see which pages and links are useful.</td>
                <td>
                  Optional and off until you allow it. You can change this in{' '}
                  <button type="button" className="text-link legal__inline-btn" onClick={openPrivacySettings}>
                    Privacy settings
                  </button>
                  .
                </td>
              </tr>
              <tr>
                <th scope="row">Every visit</th>
                <td>
                  Like any website, the server receives your IP address and browser details in order to send you the
                  page. The website itself does not write these to a log; IP addresses are held only in memory, for up
                  to a day, to limit repeated form submissions and sign-in attempts. Whether the hosting provider keeps
                  its own access logs: <ToConfirm>to be confirmed once hosting is chosen</ToConfirm>.
                </td>
                <td>To deliver the website and protect it from abuse.</td>
                <td>Needed to use the website.</td>
              </tr>
              <tr>
                <th scope="row">Katoto officers sign in to manage the site</th>
                <td>Their username, a scrambled (hashed) password, and a sign-in cookie.</td>
                <td>To let only authorized officers change the website.</td>
                <td>Officers only.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="not-collected" title="What this website does not collect">
        <ul>
          <li>No advertising, tracking, or social media cookies, and no third-party analytics.</li>
          <li>No online volunteer application. Applications are made through the CV form posted on Katoto’s Facebook page, by email, or on paper, so this website does not store application details, birth dates, or identity documents.</li>
          <li>No payments. Donations go directly through the channel shown on the page (for example GCash); the website does not process or record them.</li>
          <li>
            When you click an email link and choose Gmail, Outlook, or Yahoo Mail, or follow a link to Facebook, that
            service’s own privacy policy applies. Emails you send directly to {contact.email} are handled in Katoto’s
            email inbox, outside this website.
          </li>
        </ul>
      </Section>

      <Section id="published" title="Information Katoto publishes">
        <p>
          The website shows the names and positions of Katoto’s officers, barangay coordinators, and committee heads;
          photos from Katoto’s activities, which may show identifiable people, including young people; and documents
          Katoto posts under Freedom of Information. Before uploading photos, an officer must confirm that Katoto has
          permission to publish them, including from a parent or guardian for anyone under 18.
        </p>
        <p>
          If you appear on the website and want something changed or removed, use the{' '}
          <Link to="/data-deletion">privacy request form</Link>.
        </p>
      </Section>

      <Section id="basis" title="Why we may use your information">
        <p>Under the Data Privacy Act of 2012 (Republic Act No. 10173), Katoto relies on:</p>
        <ul>
          <li><strong>Your consent</strong> for the contact form and for visit statistics. You can withdraw it at any time; this does not affect what was done before.</li>
          <li><strong>Handling your request and keeping a record of it</strong> for privacy requests.</li>
          <li><strong>Katoto’s legitimate interest</strong> in keeping the website running and secure, for the technical information received on every visit.</li>
        </ul>
      </Section>

      <Section id="sharing" title="Who receives your information">
        <p>Katoto does not sell personal information or share it for advertising.</p>
        <ul>
          <li><strong>Katoto officers</strong> who manage the website can read contact messages and privacy requests in the admin area.</li>
          <li>
            <strong>Email provider:</strong>{' '}
            {privacy.emailAlerts ? (
              <>
                a copy of each contact message is emailed to Katoto’s inbox ({contact.email}), which is provided by
                Google (Gmail). That copy stays in the inbox until Katoto deletes it. Privacy-request alerts contain
                only a reference number.
              </>
            ) : (
              <>email alerts are currently turned off, so messages stay on the website’s server.</>
            )}
          </li>
          <li>
            <strong>Hosting provider:</strong> the company that runs the server stores the website’s database and files:{' '}
            <ToConfirm>to be named once hosting is chosen</ToConfirm>.
          </li>
          <li>Authorities, if Katoto is legally required to disclose information.</li>
        </ul>
      </Section>

      <Section id="retention" title="How long we keep it">
        <div className="legal__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Information</th>
                <th scope="col">Kept for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Contact messages on the website</th>
                <td>Deleted automatically {years(privacy.messageRetentionDays)} after they arrive, or sooner if Katoto deletes them.</td>
              </tr>
              <tr>
                <th scope="row">Copies of messages in Katoto’s email inbox</th>
                <td>Until Katoto deletes them from the inbox. These are not deleted automatically.</td>
              </tr>
              <tr>
                <th scope="row">Privacy requests</th>
                <td>
                  When a request is closed, its free-text details are erased. The remaining record (type, name, email,
                  dates, and what was done) is deleted automatically {years(privacy.privacyRequestRetentionDays)} later.
                </td>
              </tr>
              <tr>
                <th scope="row">Visit statistics</th>
                <td>Deleted automatically after {privacy.visitStatsRetentionDays} days. The daily secret used for visitor codes is destroyed the next day.</td>
              </tr>
              <tr>
                <th scope="row">Server backups</th>
                <td>
                  <ToConfirm>depends on the hosting set-up</ToConfirm>. Deleted information can remain in a backup until
                  that backup is replaced.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="security" title="How we protect it">
        <ul>
          <li>Only signed-in Katoto officers can see messages and requests; every admin action is checked on the server.</li>
          <li>Admin passwords are stored only as scrambled hashes, sign-in attempts are limited, and sign-in cookies can’t be read by scripts on the page.</li>
          <li>When the website runs in production mode, it requires a secure HTTPS connection.</li>
          <li>Uploaded photos are re-saved without hidden location data.</li>
        </ul>
        <p>
          No website can be made completely secure, and these measures do not guarantee that information can never be
          accessed without permission. If Katoto learns of a breach that affects you, it will follow the notification
          duties that apply under Philippine law.
        </p>
      </Section>

      <Section id="minors" title="Young people and minors">
        <p>
          Katoto’s volunteers and members are 15 to 30 years old, so some people who contact us are under 18. The
          website asks only for what is needed to reply: a name, an email address, and a message. It never asks for
          birth dates, school records, or identity documents.
        </p>
        <p>
          If you are under 18, please ask a parent or guardian to read this policy with you before you send a message. A
          parent or guardian can also make a privacy request on a minor’s behalf, for example to remove a photo.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <p>Under the Data Privacy Act you have the right to:</p>
        <ul>
          <li>be informed about how your information is used (this policy);</li>
          <li>get a copy of the information Katoto holds about you;</li>
          <li>have wrong or incomplete information corrected;</li>
          <li>object to processing, and withdraw consent you gave;</li>
          <li>have your information deleted or blocked when there is no longer a valid reason to keep it;</li>
          <li>get your information in a commonly used electronic format;</li>
          <li>file a complaint with the National Privacy Commission.</li>
        </ul>
        <p>
          To use these rights, send a <Link to="/data-deletion">privacy request</Link> or email {email}. Katoto will
          email you at the address you give to confirm the request came from you before acting on it.
        </p>
      </Section>

      <Section id="contact" title="Contact and complaints">
        <p>
          Privacy questions: {email}. If you are not satisfied with Katoto’s answer, you can contact the National Privacy
          Commission at <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer">privacy.gov.ph<span className="visually-hidden"> (opens in a new tab)</span></a>.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          When the website starts collecting something new or uses information differently, this page will be updated
          and the date at the top changed. If the change needs your permission, for example a new optional feature, you
          will be asked again.
        </p>
      </Section>
    </LegalPage>
  )
}
