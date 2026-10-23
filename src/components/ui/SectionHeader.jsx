import Reveal from './Reveal'
import './SectionHeader.css'

export default function SectionHeader({ num, label, title, id, children, tone = 'light', align = 'split' }) {
  return (
    <Reveal className={`section-header section-header--${align} section-header--${tone}`}>
      <div className="section-header__label">
        <span className="eyebrow">
          <span className="eyebrow-num">{num}</span>
          <span aria-hidden="true" className="section-header__rule" />
          {label}
        </span>
      </div>
      <div className="section-header__body">
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {children && <div className="section-header__intro">{children}</div>}
      </div>
    </Reveal>
  )
}
