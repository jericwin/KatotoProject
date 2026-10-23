import { useState } from 'react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import Mosaic from './ui/Mosaic'
import mark from '../assets/katoto-mark.webp'
import { vision, mission, objectives } from '../data/organization'
import { useSite } from '../site/SiteContext'
import './About.css'

function Statement({ data, accent }) {
  const [lang, setLang] = useState('fil')
  return (
    <article className="statement" style={{ '--accent': accent }}>
      <header className="statement__head">
        <h3>
          <span className="statement__en">{data.english}</span>
          <span className="statement__fil" lang="fil">
            {data.label}
          </span>
        </h3>
        <div className="lang-toggle" role="group" aria-label={`Language for ${data.english.toLowerCase()}`}>
          <button type="button" aria-pressed={lang === 'fil'} onClick={() => setLang('fil')}>
            Filipino
          </button>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </header>
      {lang === 'fil' ? (
        <p className="statement__body" lang="fil">
          {data.original}
        </p>
      ) : (
        <p className="statement__body">{data.translation}</p>
      )}
    </article>
  )
}

export default function About() {
  const { content } = useSite()
  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container">
        <SectionHeader num="01" label="Who we are" id="about-title" title={<>A kalakbay walks the road with you.</>}>
          <p>{content.about.intro}</p>
        </SectionHeader>

        <div className="about__story">
          <Reveal className="about__emblem">
            <img src={mark} alt="" aria-hidden="true" width="360" height="248" loading="lazy" />
            <p className="about__emblem-caption">
              Five figures reach toward one another around the seal of Paete, the centre of the Katoto logo.
            </p>
          </Reveal>

          <div className="about__text">
            {content.about.paragraphs.map((p, i) => (
              <Reveal as="p" key={i} delay={i * 0.05}>
                {p}
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="about__quote">
          <Mosaic className="about__quote-mosaic" cols={3} rows={18} seed={11} />
          <blockquote>
            <p lang="fil">“{mission.pullQuote}”</p>
            <footer>
              <span>{mission.pullQuoteEnglish}</span>
              <cite>From the Katoto mission, Constitution Art. II</cite>
            </footer>
          </blockquote>
        </Reveal>

        <div className="about__statements">
          <Reveal>
            <Statement data={vision} accent="var(--k-blue)" />
          </Reveal>
          <Reveal delay={0.08}>
            <Statement data={mission} accent="var(--k-red)" />
          </Reveal>
        </div>

        <div className="about__objectives">
          <Reveal className="about__objectives-head">
            <h3>Seven objectives</h3>
            <p>Written into Article II of the Katoto Constitution and By-Laws.</p>
          </Reveal>
          <ol className="objectives">
            {objectives.map((o, i) => (
              <Reveal as="li" key={o.id} delay={i * 0.04}>
                <span className="objectives__letter" aria-hidden="true">
                  {o.id}
                </span>
                {o.text}
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
