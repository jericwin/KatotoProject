import { Link } from 'react-router-dom'
import LegalPage, { Section } from './LegalPage'
import { useSite } from '../site/SiteContext'

const SECTIONS = [
  { id: 'about', title: 'About these terms' },
  { id: 'use', title: 'Using the website' },
  { id: 'content', title: 'Katoto’s content, logo, and photos' },
  { id: 'your-messages', title: 'What you send us' },
  { id: 'volunteers', title: 'Volunteer and member applications' },
  { id: 'donations', title: 'Donations' },
  { id: 'links', title: 'Links to other websites' },
  { id: 'availability', title: 'Availability and accuracy' },
  { id: 'changes', title: 'Changes to these terms' },
  { id: 'contact', title: 'Questions and concerns' },
]

export default function TermsOfService() {
  const { contact } = useSite().content
  const email = <a href={`mailto:${contact.email}`}>{contact.email}</a>

  return (
    <LegalPage
      title="Terms of Service"
      sections={SECTIONS}
      intro={<p>These terms explain, in plain language, how you may use the Katoto Project website.</p>}
    >
      <Section id="about" title="About these terms">
        <p>
          This website is run by Katoto Project, a youth organization in {contact.address}. By using the website you agree
          to use it as described here. How Katoto handles personal information is explained separately in the{' '}
          <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="use" title="Using the website">
        <p>You are welcome to read, share links to, and print pages from this website for personal and community use. Please don’t:</p>
        <ul>
          <li>send spam, false information, or messages meant to harass, threaten, or deceive;</li>
          <li>pretend to be someone else, or to speak for Katoto Project when you don’t;</li>
          <li>try to get into the admin area, other people’s information, or parts of the website you aren’t allowed to use;</li>
          <li>try to overload, break, or scan the website for weaknesses, or send it harmful code;</li>
          <li>collect information about other people from the website, for example the names of officers, for unrelated purposes.</li>
        </ul>
        <p>Katoto may block access or ignore messages that break these rules.</p>
      </Section>

      <Section id="content" title="Katoto’s content, logo, and photos">
        <p>
          The text, the Katoto Project name and logo, and the photos on this website belong to Katoto Project or to the
          people who took them or appear in them. Please don’t reuse the logo or photos, edit them, or use them to suggest
          that Katoto supports something, without written permission from Katoto Project. Quoting short passages with a
          link back to the website is fine.
        </p>
        <p>
          If you think something on the website uses your work or your image without permission, tell us through the{' '}
          <Link to="/data-deletion">privacy request form</Link> or at {email}.
        </p>
      </Section>

      <Section id="your-messages" title="What you send us">
        <p>
          Messages and requests you send through the website are read by Katoto’s officers and are not published. Please
          send only what is needed. Don’t include passwords, identity documents, or sensitive details such as health
          information.
        </p>
      </Section>

      <Section id="volunteers" title="Volunteer and member applications">
        <p>
          The volunteer section lists Katoto Project’s official qualifications and how to apply. Applying does not
          guarantee membership; Katoto decides on applications through its own process, as described on the website.
        </p>
      </Section>

      <Section id="donations" title="Donations">
        <p>
          The website shows Katoto’s donation channel but does not take payments. Donations are made directly through that
          channel and are voluntary. The website charges no fees.
        </p>
      </Section>

      <Section id="links" title="Links to other websites">
        <p>
          Links to Facebook, Gmail, Outlook, Yahoo Mail, and other websites are provided for convenience. Those websites
          have their own terms and privacy policies, and Katoto is not responsible for them.
        </p>
      </Section>

      <Section id="availability" title="Availability and accuracy">
        <p>
          Katoto tries to keep the website available and its information accurate and up to date, but the website may
          sometimes be unavailable, and information can change. For anything important, such as dates or requirements,
          confirm directly with Katoto Project.
        </p>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>If these terms change, this page will be updated and the date at the top changed.</p>
      </Section>

      <Section id="contact" title="Questions and concerns">
        <p>
          Questions about these terms, or a concern about the website: {email}. Please contact Katoto first, so it can try
          to resolve the issue with you.
        </p>
      </Section>
    </LegalPage>
  )
}
