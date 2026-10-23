// Single source of truth for organization content.
// Every fact here comes from the files in the project root:
//   - "Katoto Project Profile 2026 .pdf" (Constitution & By-Laws, masterlist,
//     Executive Committee, committee rosters, YDAO certificate)
//   - logo.jpg
//   - 0790fbc8-…jpeg (contact number & donation channel announcement)
//   - e779ce4b-…jpeg ("6 Pillars of Katoto Project" graphic)
// Anything that still needs confirmation is marked with `CONFIRM:`.

export const org = {
  name: 'Katoto Project',
  tagline: 'Kalakbay ng bawat batang Paeteño',
  taglineEnglish: 'A companion to every young Paeteño',
  founded: 'June 26, 2020',
  foundedYear: 2020,
  // CONFIRM: the constitution says "Accredited: March 2, 2021" without naming the accrediting body.
  firstAccredited: 'March 2, 2021',
  location: 'Paete, Laguna',
  postal: '4016',
}

export const contact = {
  email: 'katotoprojectofficial@gmail.com',
  // From the "We've updated our contact number & donation channel" announcement.
  // CONFIRM: the 2026 letterhead still lists 0920 2764 414 / 0951 6446 148.
  phoneDisplay: '0992 619 2807',
  phoneHref: 'tel:+639926192807',
  facebookUrl: 'https://www.facebook.com/KatotoProjectOfficialPaete',
  facebookLabel: 'Katoto Project (Facebook)',
  address: '4016 Paete, Laguna, Philippines',
}

export const donation = {
  channel: 'GCash',
  number: '0992 619 2807',
  numberRaw: '09926192807',
  accountName: 'Rowell Y.',
}

export const vision = {
  label: 'Ang Pananaw ng Katoto',
  english: 'Our vision',
  original:
    'Isang samahang magsisilbing modelo sa mga kapwa kabataan at magpapatotoo sa marami pang kontribusyon na maiaambag ng kabataan sa bayan. At maging repleksyon ng pag-asa sa bawat isang nangangailangan ng tulong at espasyo upang itanghal ang sariling kakayahan. Ang KATOTO ay magbubunga ng maraming pangarap na bubuo sa kaunlarang kailangan ng lipunan.',
  translation:
    'An organization that serves as a model for fellow young people and proves how much more the youth can contribute to their town; a reflection of hope for everyone who needs help, and a space to show what they can do. KATOTO will bear many dreams that build the progress our society needs.',
}

export const mission = {
  label: 'Ang Misyon ng Katoto',
  english: 'Our mission',
  original:
    'Maging kabataan na puno ng pangarap at adhikain para sa bayan at mga mahihirap na pamilya at kabataan. At magsilbing tulay sa pangarap ng mga kapos na mag-aaral at batang nagugutom. Hahanapin at tutuntunin ng lahat ng KATOTO ang mga kabataang nangangailangan ng kalakbay tungo sa katuparan ng pangarap at misyon sa bayan.',
  translation:
    'To be young people full of dreams and purpose for our town and for families and youth in need; to be a bridge to the dreams of struggling students and hungry children. Every KATOTO will seek out the young people who need a companion on the way to fulfilling their dreams and their mission for the town.',
  pullQuote: 'Magsilbing tulay sa pangarap ng mga kapos na mag-aaral at batang nagugutom.',
  pullQuoteEnglish: 'To be a bridge to the dreams of struggling students and hungry children.',
}

// Article II, Section 3 — in the order the constitution lists them.
export const objectives = [
  { id: 'a', text: 'To combat hunger' },
  { id: 'b', text: 'To promote quality and accessible education for all' },
  { id: 'c', text: 'To set a standard for good governance' },
  { id: 'd', text: 'To eradicate illiteracy' },
  { id: 'e', text: 'To preserve the culture, arts, and history of Paete' },
  { id: 'f', text: 'To provide platforms for youth initiatives' },
  { id: 'g', text: 'To promote holistic health for youth' },
]

export const facts = [
  { value: '2020', label: 'Founded June 26, 2020', note: 'Paete, Laguna' },
  { value: '36', label: 'Members on the roll', note: 'Masterlist as of July 12, 2026' },
  { value: '10', label: 'Barangay coordinators', note: 'Barangays 1–9 and Upland' },
  { value: '6', label: 'Pillars, each with a committee', note: 'As set out in Katoto’s “6 Pillars”' },
]

export const accreditation = {
  issuer: 'Youth Development Affairs Office of Laguna',
  government: 'Provincial Government of Laguna',
  registeredName: 'Katoto Project Youth Organization',
  date: 'September 18, 2026',
  place: 'YDA Office, Santa Cruz, Laguna',
  certificateNo: '09182026-0021',
  organizationId: 'YO-0003',
  scope:
    'qualified to be part of the over-all implementation of programs that will foster the development of social, spiritual, moral, physical, political and economic well-being of the youth of Laguna.',
}

export const membership = {
  eligibility: [
    'Between 15 and 30 years old',
    'Living in, or born in, the municipality of Paete',
    'Not holding any office in government',
    'Willing to pledge commitment to the advocacies of Katoto Project',
  ],
  steps: [
    {
      title: 'Submit your CV',
      body: 'The form is posted on Katoto’s official social media accounts. Printed copies are available at the Katoto Project headquarters.',
    },
    {
      title: 'Attend the General Assembly',
      body: 'Applicants are notified of the date by text message.',
    },
    {
      title: 'Join two Solidarity Days',
      body: 'Sessions of reflection, team building, and brainstorming, announced during the General Assembly.',
    },
    {
      title: 'Pledge and oath-taking',
      body: 'New members sign the pledge of commitment and take their oath. This is held every quarter.',
    },
  ],
}

export const governance = [
  {
    title: 'Weekly, together',
    body: 'All members meet every Tuesday. The Executive Committee meets on the last Sunday of each month.',
  },
  {
    title: 'Decisions by open vote',
    body: 'Executive and general members decide by open simple-majority vote of those present.',
  },
  {
    title: 'Accounts that get checked',
    body: 'FOI Commissioners review financial statements and records, with an internal auditor (a CPA) and an external auditor on the Transparency Department.',
  },
  {
    title: 'Advisors from the community',
    body: 'Katoto has no single adviser. Its Board of Advisors, the Katotong Katuwang, is made up of individuals, families, and private offices who support the youth.',
  },
]

export const leadershipTerm = 'August 22 – December 31, 2026'

export const leadership = [
  {
    group: 'Executive Committee',
    people: [
      { role: 'Chairman', name: 'Rowell Ybañez, LPT' },
      { role: 'Project Coordinator', name: 'Kate Libranda' },
      { role: 'Deputy Project Coordinator', name: 'Clarice Mae Escalona' },
      { role: 'Deputy Project Coordinator', name: 'Mylex E. Fernandez' },
      { role: 'Executive Secretary', name: 'Ginelle Ann Ariola, LPT' },
    ],
  },
  {
    group: 'Finance & Property',
    people: [
      { role: 'Finance Head', name: 'Mark Gerard Calabia' },
      { role: 'Executive Auditor', name: 'Kristine Faye Juarez' },
      { role: 'Property Custodian', name: 'Leandrino C. Limlengco' },
      { role: 'File Clerk', name: 'Clarice Mae Escalona' },
    ],
  },
  {
    group: 'Transparency',
    people: [
      { role: 'Freedom of Information Head', name: 'Princess Valenzuela' },
      { role: 'Internal Auditor', name: 'John Randolph Espaldon, CPA' },
      { role: 'External Auditor', name: 'Kate L. Libranda' },
    ],
  },
  {
    group: 'Creative',
    people: [
      { role: 'Head', name: 'Crisha Jhane Lagrosa' },
      { role: 'Assistant Head & Content Manager', name: 'Bea Daphne Afurong' },
      { role: 'Documentation Manager', name: 'Jix Andrya Principe' },
      { role: 'Graphic Artist', name: 'MJ Madridejos' },
      { role: 'Website & Accounts Manager', name: 'Mylex Fernandez' },
    ],
  },
]

export const barangayCoordinators = [
  { area: 'Brgy. 1', name: 'Lovely Baisas' },
  { area: 'Brgy. 2', name: 'Mark Joseph C. Alpon' },
  { area: 'Brgy. 3', name: 'Leandrino C. Limlengco' },
  { area: 'Brgy. 4', name: 'Mylex E. Fernandez' },
  { area: 'Brgy. 5', name: 'Princess C. Valenzuela' },
  { area: 'Brgy. 6', name: 'Sandrine Salceda' },
  { area: 'Brgy. 7', name: 'John Kali D. Cadawas' },
  { area: 'Brgy. 8', name: 'Rabiell Tolosa' },
  { area: 'Brgy. 9', name: 'Kate L. Libranda' },
  { area: 'Upland', name: 'Jameston C. Galito' },
]

// Dated entries taken from the documents. Newest first.
export const timeline = [
  {
    date: 'September 18, 2026',
    title: 'Accredited by the Province of Laguna',
    body: 'The Youth Development Affairs Office of Laguna accredited Katoto Project Youth Organization (Certificate No. 09182026-0021, Organization ID YO-0003).',
    tag: 'Recognition',
  },
  {
    date: 'August 22, 2026',
    title: 'New Executive Committee takes office',
    body: 'Chairman Rowell Ybañez, LPT, and Project Coordinator Kate Libranda lead the committee for the term ending December 31, 2026.',
    tag: 'Organization',
  },
  {
    date: 'July 12, 2026',
    title: 'Membership roll updated',
    body: 'The official masterlist now counts 36 members, with coordinators covering Barangays 1–9 and Upland Paete.',
    tag: 'Organization',
  },
  {
    // CONFIRM: the announcement graphic carries no date.
    date: '2026',
    title: 'New contact number and donation channel',
    body: 'Katoto’s contact number and GCash donation channel are now 0992 619 2807.',
    tag: 'Announcement',
  },
  {
    date: 'March 2, 2021',
    title: 'First accreditation',
    body: 'Less than a year after its founding, Katoto Project received its accreditation.',
    tag: 'Recognition',
  },
  {
    date: 'June 26, 2020',
    title: 'Katoto Project is founded',
    body: 'Young people of Paete form Katoto, “kalakbay ng bawat batang Paeteño.” Every June anniversary, the organization names a Katotong Katuwang of the Year.',
    tag: 'Founding',
  },
]
