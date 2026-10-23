import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import logo from '../assets/katoto-logo.webp'
import Mosaic from './ui/Mosaic'
import { pillars } from '../data/pillars'
import { org } from '../data/organization'
import { useSite } from '../site/SiteContext'
import './Hero.css'

// Angles (degrees, 0 = right, counter-clockwise) for the arc of six photos —
// the same arc the five figures make above the KATOTO wordmark.
const ANGLES = [196, 153.6, 111.2, 68.8, 26.4, -16]
const RADIUS = 42 // in cqw

const ease = [0.22, 1, 0.36, 1]

export default function Hero() {
  const reduce = useReducedMotion()
  const { content } = useSite()
  const rise = (delay) => ({
    initial: { opacity: 0, y: reduce ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease },
  })

  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__copy">
          <motion.p className="eyebrow hero__eyebrow" {...rise(0.05)}>
            {org.location} · Since {org.foundedYear}
          </motion.p>

          <motion.h1 id="hero-title" className="hero__title" lang="fil" {...rise(0.12)}>
            Kalakbay ng bawat batang <span className="hero__mark">Paeteño.</span>
          </motion.h1>

          <motion.p className="hero__translation" {...rise(0.2)}>
            {org.taglineEnglish}
          </motion.p>

          <motion.p className="hero__lede" {...rise(0.28)}>
            {content.hero.lede}
          </motion.p>

          <motion.div className="hero__actions" {...rise(0.36)}>
            <a href="#volunteer" className="btn">
              Become a volunteer <ArrowRight aria-hidden="true" />
            </a>
            <a href="#pillars" className="btn btn-ghost">
              See the six pillars
            </a>
          </motion.div>

          <motion.a href="#record" className="hero__badge" {...rise(0.44)}>
            <BadgeCheck aria-hidden="true" />
            <span>
              Accredited by the <strong>Youth Development Affairs Office of Laguna</strong>, September 2026
            </span>
          </motion.a>
        </div>

        <div className="hero__visual">
          <div className="hero__arc">
            <svg className="hero__path" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
              <motion.path
                d="M 9.63 69.58 A 42 42 0 1 1 90.37 69.58"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, delay: 0.2, ease }}
              />
            </svg>
            <ul className="hero__arc-list" aria-label="The six pillars of Katoto Project">
              {pillars.map((p, i) => {
                const rad = (ANGLES[i] * Math.PI) / 180
                const x = 50 + Math.cos(rad) * RADIUS
                const y = 58 - Math.sin(rad) * RADIUS
                return (
                  <motion.li
                    key={p.id}
                    className="hero__orb"
                    style={{ '--x': x, '--y': y, '--ring': p.color }}
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease }}
                  >
                    <a href={`#pillar-${p.id}`} className="hero__orb-link">
                      {/* The label names the link; the same photo is described in the Pillars section. */}
                      <img src={p.image} alt="" width="184" height="184" fetchPriority={i < 3 ? 'high' : 'auto'} />
                      <span className="hero__orb-label">{p.name}</span>
                    </a>
                  </motion.li>
                )
              })}
            </ul>
            <div className="hero__logo">
              <motion.img
                src={logo}
                alt=""
                aria-hidden="true"
                width="720"
                height="433"
                initial={{ opacity: 0, y: reduce ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease }}
              />
            </div>
          </div>
        </div>
      </div>
      <Mosaic className="hero__mosaic" cols={72} rows={1} seed={20200626} />
    </section>
  )
}
