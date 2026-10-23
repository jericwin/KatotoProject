// The editable site content, as one document. The server seeds the database
// with this on first run; the public site also uses it as a fallback when the
// API cannot be reached (e.g. a static-only deployment). Keep it free of
// asset imports so Node can load it.
import { org, contact, donation, timeline, membership, leadership, leadershipTerm, barangayCoordinators } from './organization.js'
import { pillarText } from './pillarText.js'

export const defaultContent = {
  hero: {
    lede: 'Katoto Project is a youth organization of young Paeteños, ages 15 to 30. We set out to be a bridge to the dreams of struggling students and hungry children, and we work through six pillars, from education and health to the culture, arts, and history of our town.',
  },
  about: {
    intro: `Katoto means a close companion, the friend who stays. Katoto Project took the word as its name in Paete, Laguna, on ${org.founded}, and set itself one job: to find the young people who need someone beside them and walk with them toward their dreams.`,
    paragraphs: [
      'Katoto is made up of young people from Paete who have pledged themselves to the organization’s advocacies. Members organize by committee and by barangay, with a coordinator in each of Paete’s nine barangays and its upland area.',
      `The organization was accredited on ${org.firstAccredited}, less than a year after it began. In 2026 it was accredited by the Province of Laguna’s Youth Development Affairs Office, which made it part of the province’s youth development programs.`,
    ],
  },
  pillars: Object.fromEntries(pillarText.map((p) => [p.id, { summary: p.summary, caption: p.caption }])),
  volunteer: {
    eyebrow: 'Call for volunteers',
    // Heading and the four qualifications are the official text supplied by
    // Katoto Project for its call for new volunteers and members.
    heading: 'KATOTO PROJECT CALL FOR NEW VOLUNTEERS AND MEMBERS!',
    intro:
      'Katoto Project is looking for young people ready to give their time and energy to Paete. As a volunteer and member, you join one of Katoto’s committees, from education and health to culture and arts, the environment, and good youth governance, and help carry its community work alongside fellow kalakbay.',
    qualifications: [
      'Must be 15–30 years old.',
      'Completed or finishing formal education.',
      'Must not be a member of any other civic organization in Paete.',
      'Must have no pending cases from the Barangay or any government agency.',
    ],
    // From the Constitution & By-Laws, Article III, Section 2.
    stepsTitle: 'How to apply',
    steps: membership.steps,
    applyLabel: 'Apply as a Volunteer',
    applyUrl: contact.facebookUrl,
    applyNote:
      'The CV form is posted on Katoto Project’s official Facebook page. Send the page a message to apply, or email your CV and questions to the address below.',
    secondaryLabel: 'Apply by email',
    secondaryUrl: `mailto:${contact.email}?subject=${encodeURIComponent('Volunteer and member application')}`,
  },
  contact: {
    email: contact.email,
    phoneDisplay: contact.phoneDisplay,
    facebookUrl: contact.facebookUrl,
    address: contact.address,
  },
  donation: {
    channel: donation.channel,
    number: donation.number,
    accountName: donation.accountName,
  },
  // Privacy contact shown in the Privacy Policy. Empty until Katoto designates
  // a Data Protection Officer.
  legal: {
    dpoName: '',
    dpoEmail: '',
  },
  // Officers, barangay coordinators and committee leads for the current term,
  // from the 2026 Katoto Project Profile.
  people: {
    term: leadershipTerm,
    groups: leadership.map((g) => ({ name: g.group, members: g.people.map((p) => ({ role: p.role, name: p.name })) })),
    coordinators: barangayCoordinators.map((b) => ({ area: b.area, name: b.name })),
    committees: Object.fromEntries(pillarText.map((p) => [p.id, { ...p.lead }])),
  },
}

// Topics offered in the website's contact form.
export const CONTACT_TOPICS = ['General inquiry', 'Membership', 'Katotong Katuwang / partnership', 'Donation', 'Media or invitation']

// Categories for Freedom of Information posts.
export const FOI_CATEGORIES = ['Financial report', 'Audit report', 'Announcement', 'Minutes & resolutions', 'Policy', 'Other']

// Seed rows for the News & updates table.
export const defaultNews = timeline.map((t, i) => ({
  dateLabel: t.date,
  title: t.title,
  body: t.body,
  tag: t.tag,
  position: i,
}))

export const NEWS_TAGS = ['Recognition', 'Organization', 'Announcement', 'Founding', 'Activity', 'Event']
