import { Link } from 'react-router-dom'
import { Badge, RegisterButton } from '../components/ui.tsx'
import { CalendarIcon, PinIcon } from '../components/icons.tsx'
import { DIVISIONS, EVENT } from '../config/event.ts'
import { TEAMS } from '../config/roster.ts'
import { teamLabel } from '../domain/tournament.ts'
import { PHASE_OPENS_LABEL, type PortalSection } from '../config/publication.ts'
import { isSectionPublished } from '../domain/publication.ts'
import { usePortal } from '../hooks/portalContext.ts'

interface PortalCard {
  readonly section: PortalSection
  readonly to: string
  readonly title: string
  readonly text: string
  readonly opens?: string
}

const CARDS: readonly PortalCard[] = [
  { section: 'guide', to: '/guide', title: 'Player Guide', text: 'Rules, scoring, formats and FAQs.' },
  { section: 'schedule', to: '/schedule', title: 'Schedule', text: 'Category blocks, courts and the match pattern.' },
  {
    section: 'brackets',
    to: '/brackets',
    title: 'Brackets & player search',
    text: 'Find your team, partner, division and bracket.',
    opens: PHASE_OPENS_LABEL[2],
  },
  {
    section: 'live',
    to: '/live',
    title: 'Live & upcoming',
    text: 'What is on court now, what plays next and the queue.',
    opens: PHASE_OPENS_LABEL[3],
  },
  {
    section: 'standings',
    to: '/standings',
    title: 'Standings & playoffs',
    text: 'Live standings, semifinals and medal results.',
    opens: PHASE_OPENS_LABEL[3],
  },
]

export function Home() {
  const { phase } = usePortal()
  const base = import.meta.env.BASE_URL

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{EVENT.dateLabel}</p>
          <h1 id="hero-title">
            Echelon <span>Pickleball</span> Cup 2026
          </h1>
          <p className="hero-tagline">Play with purpose. Every game makes a difference.</p>
          <p className="hero-lead">
            Open to pickleball enthusiasts of all skill levels, subject to category requirements, tournament
            eligibility and committee assessment.
          </p>
          <div className="actions">
            <RegisterButton />
            <Link className="button button-ghost" to="/guide">
              Read the Player Guide
            </Link>
          </div>
        </div>
        <figure className="hero-poster">
          <img
            src={`${base}assets/poster.jpg`}
            alt="Official Echelon Pickleball Cup poster showing the event title, the three skill classifications and a registration QR code."
            width="1536"
            height="1024"
            fetchPriority="high"
          />
          <figcaption>
            Official event poster. Event details on this website are the latest confirmed information and may differ
            from older poster text.
          </figcaption>
        </figure>
      </section>

      <p className="motto" aria-label="Fraternity, Service, Unity">
        <span>Fraternity</span>
        <span aria-hidden="true">★</span>
        <span>Service</span>
        <span aria-hidden="true">★</span>
        <span>Unity</span>
      </p>

      <section className="charity-banner" aria-label="Charitable purpose">
        <p className="charity-kicker">Play with purpose</p>
        <p className="charity-text">{EVENT.charityStatement}</p>
      </section>

      <section className="facts" aria-label="Event details">
        <div className="fact">
          <CalendarIcon />
          <div>
            <p className="fact-label">Date and time</p>
            <p className="fact-value">{EVENT.dateShort}</p>
            <p>{EVENT.timetable} · Saturday</p>
          </div>
        </div>
        <div className="fact">
          <PinIcon />
          <div>
            <p className="fact-label">Venue</p>
            <p className="fact-value">{EVENT.venue}</p>
            <p>{EVENT.address}</p>
          </div>
        </div>
        <div className="fact">
          <div className="fact-number" aria-hidden="true">
            ₱
          </div>
          <div>
            <p className="fact-label">Registration</p>
            <p className="fact-value">₱{EVENT.feePhp.toLocaleString('en-PH')} per player</p>
            <p>Includes a jersey and a meal. Winners receive medals. Register by {EVENT.registrationDeadline}.</p>
          </div>
        </div>
        <div className="fact">
          <div className="fact-number" aria-hidden="true">
            5
          </div>
          <div>
            <p className="fact-label">Guaranteed matches</p>
            <p className="fact-value">Every pair plays five</p>
            <p>A round robin of six pairs per division, on courts 8, 9 and 10.</p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="open-now">
        <h2 id="open-now">What&apos;s on this site</h2>
        <ul className="portal-cards">
          {CARDS.map((card) => {
            const open = isSectionPublished(card.section, phase)
            return (
              <li key={card.to} className={open ? 'portal-card' : 'portal-card is-locked'}>
                {open ? (
                  <Link to={card.to}>
                    <span className="portal-card-title">{card.title}</span>
                    <span>{card.text}</span>
                    <Badge tone="ok">Open</Badge>
                  </Link>
                ) : (
                  <div>
                    <span className="portal-card-title">{card.title}</span>
                    <span>{card.text}</span>
                    <Badge tone="gold">Opens {card.opens}</Badge>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="section" aria-labelledby="who-plays">
        <h2 id="who-plays">Two divisions, six pairs each</h2>
        <div className="split">
          {DIVISIONS.map((d) => (
            <div key={d.id} className="card">
              <h3>{d.name}</h3>
              <ol className="bracket-teams">
                {TEAMS.filter((t) => t.division === d.id).map((team) => (
                  <li key={team.id}>
                    <span className="slot">{team.slot}</span>
                    <span>{teamLabel(team)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
