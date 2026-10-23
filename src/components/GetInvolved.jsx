import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Share2, Wallet } from 'lucide-react'
import Reveal from './ui/Reveal'
import SectionHeader from './ui/SectionHeader'
import CopyButton from './ui/CopyButton'
import { useSite } from '../site/SiteContext'
import './GetInvolved.css'

function ShareButton() {
  const [status, setStatus] = useState('')
  const share = async () => {
    const data = {
      title: 'Katoto Project',
      text: 'Katoto Project: kalakbay ng bawat batang Paeteño. A youth organization from Paete, Laguna.',
      url: window.location.origin + window.location.pathname,
    }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        // The visitor closed the share sheet; nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(data.url)
      setStatus('Link copied. Paste it anywhere to share.')
    } catch {
      setStatus(`Copy this link to share: ${data.url}`)
    }
  }
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={share}>
        <Share2 aria-hidden="true" /> Share this page
      </button>
      <p className="join__status" role="status" aria-live="polite">
        {status}
      </p>
    </>
  )
}

export default function GetInvolved() {
  const { content } = useSite()
  const { contact, donation } = content
  const mailto = (subject) => `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`
  const hasDonation = donation.channel && donation.number

  return (
    <section id="join" className="section join" aria-labelledby="join-title">
      <div className="container">
        <SectionHeader num="07" label="Get involved" id="join-title" title="Stand with Katoto.">
          <p>
            Not between 15 and 30? You can still help. Stand behind the youth as a Katotong Katuwang, give through
            Katoto’s donation channel, or help spread the word.{' '}
            <a href="#volunteer" className="text-link">
              Young Paeteños can apply as volunteers <ArrowRight aria-hidden="true" />
            </a>
          </p>
        </SectionHeader>

        <div className={`join__paths ${hasDonation ? '' : 'join__paths--two'}`}>
          {/* Katotong Katuwang ------------------------------------------- */}
          <Reveal as="article" className="join__card join__card--katuwang">
            <p className="eyebrow join__tag">For individuals, families &amp; offices</p>
            <h3>
              Be a <span lang="fil">Katotong Katuwang</span>
            </h3>
            <p>
              Katoto has no single adviser. Its Board of Advisors, the <em lang="fil">Katotong Katuwang</em>, is made
              up of the individuals, families, and private offices who support the youth. Anyone can be part of it.
            </p>
            <p>
              Every June, on Katoto’s anniversary, the organization names a <strong>Katotong Katuwang of the Year</strong>{' '}
              for the most supportive and outstanding model for the youth.
            </p>
            <a href={mailto('Katotong Katuwang inquiry')} className="text-link">
              Write to us about supporting Katoto <ArrowUpRight aria-hidden="true" />
            </a>
          </Reveal>

          {/* Donation ---------------------------------------------------- */}
          {hasDonation && (
            <Reveal as="article" className="join__card join__card--give" delay={0.06}>
              <p className="eyebrow join__tag">
                <Wallet aria-hidden="true" /> Donation channel
              </p>
              <h3>Give through {donation.channel}</h3>
              <dl className="join__gcash">
                <div>
                  <dt>{donation.channel} number</dt>
                  <dd>{donation.number}</dd>
                </div>
                {donation.accountName && (
                  <div>
                    <dt>Account name</dt>
                    <dd>{donation.accountName}</dd>
                  </div>
                )}
              </dl>
              <div className="join__actions">
                <CopyButton value={donation.number.replace(/\s+/g, '')} label="Copy number" className="btn btn-light" />
              </div>
              <p className="join__fineprint">
                These details are from Katoto’s official announcement. Please check the official Facebook page or message
                Katoto before you send, and keep your receipt.
              </p>
            </Reveal>
          )}

          {/* Share ------------------------------------------------------- */}
          <Reveal as="article" className="join__card join__card--share" delay={0.12}>
            <p className="eyebrow join__tag">For everyone</p>
            <h3>Spread the word</h3>
            <p>
              Know a young Paeteño who would make a good Katoto, or someone who could help? Send them this page or follow
              Katoto on Facebook for announcements.
            </p>
            <div className="join__actions">
              <ShareButton />
              <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                Follow on Facebook <ArrowUpRight aria-hidden="true" />
                <span className="visually-hidden">(opens in a new tab)</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
