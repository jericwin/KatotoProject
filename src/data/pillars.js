import education from '../assets/pillar-education.webp'
import health from '../assets/pillar-health.webp'
import youth from '../assets/pillar-youth-empowerment.webp'
import culture from '../assets/pillar-culture-arts.webp'
import environment from '../assets/pillar-environment.webp'
import governance from '../assets/pillar-good-governance.webp'
import { pillarText } from './pillarText'

// The six pillars shown in Katoto's own "6 Pillars of Katoto Project" graphic,
// each with the standing committee and the constitutional objectives it carries.
// Photo descriptions describe only what is visible in each image. Summaries and
// captions are editable from the admin dashboard (see pillarText.js).
const media = {
  education: {
    color: 'var(--k-red)',
    image: education,
    alt: 'Children holding clear plastic packs, standing with Katoto members in front of a Katoto Project banner outdoors.',
    objectives: ['b', 'd'],
  },
  health: {
    color: 'var(--k-green)',
    image: health,
    alt: 'Volunteers in white shirts preparing food from large cooking pots under the trees.',
    objectives: ['a', 'g'],
  },
  'youth-empowerment': {
    color: 'var(--k-yellow)',
    image: youth,
    alt: 'A group of Katoto members in matching navy shirts posing together indoors.',
    objectives: ['f'],
  },
  'culture-arts': {
    color: 'var(--k-purple)',
    image: culture,
    alt: 'A large group of children holding up papers in front of a barangay hall, with Katoto members among them.',
    objectives: ['e'],
  },
  environment: {
    color: 'var(--k-teal)',
    image: environment,
    alt: 'Katoto members working on a steep grassy hillside, one taking a selfie in the foreground.',
    objectives: [],
  },
  'good-governance': {
    color: 'var(--k-blue)',
    image: governance,
    alt: 'Katoto representatives on stage with other awardees beneath an “Outstanding Volunteer” banner, a flower-lined table in front.',
    objectives: ['c'],
  },
}

export const pillars = pillarText.map((p) => ({ ...p, ...media[p.id] }))
