import { pillars } from './pillars'
import certificate from '../assets/yda-accreditation-2026.webp'
import certificateSm from '../assets/yda-accreditation-2026-sm.webp'
import poster from '../assets/six-pillars-poster.webp'

// Documents lead so the poster and certificate anchor the grid. The activity
// photos come from Katoto's own "6 Pillars" graphic, where they appear as
// small circles, so they are shown here as circles at modest sizes.
export const galleryItems = [
  {
    id: 'doc-pillars',
    kind: 'document',
    category: 'Documents',
    src: poster,
    thumb: poster,
    alt: 'Katoto Project graphic titled “6 Pillars of Katoto Project” showing the logo and six circular photos labelled Education, Health, Youth Empowerment, Culture and Arts, Environment, and Good Youth Governance.',
    title: '6 Pillars of Katoto Project',
    caption: 'Katoto’s own graphic introducing its six pillars.',
  },
  {
    id: 'doc-certificate',
    kind: 'document',
    category: 'Documents',
    src: certificate,
    thumb: certificateSm,
    alt: 'Certificate of Accreditation from the Provincial Government of Laguna, Youth Development Affairs Office, certifying Katoto Project Youth Organization, dated 18 September 2026.',
    title: 'Certificate of Accreditation',
    caption: 'Youth Development Affairs Office of Laguna, September 18, 2026.',
  },
  ...pillars.map((p) => ({
    id: `photo-${p.id}`,
    kind: 'photo',
    category: 'Activities',
    src: p.image,
    thumb: p.image,
    alt: p.alt,
    title: p.name,
    caption: p.caption,
    color: p.color,
  })),
]
