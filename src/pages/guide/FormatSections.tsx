import { Link } from 'react-router-dom'
import { BracketMatrix } from '../../components/BracketMatrix.tsx'
import { PinIcon } from '../../components/icons.tsx'
import { Notice, RegisterButton } from '../../components/ui.tsx'
import { DIVISIONS, EVENT } from '../../config/event.ts'
import { BRACKET_FORMAT, ROUND_ROBIN_ROUNDS } from '../../config/rules.ts'
import { TEAMS } from '../../config/roster.ts'
import { teamLabel } from '../../domain/tournament.ts'

export function AboutSection() {
  return (
    <>
      <p>
        The {EVENT.name} is a one-day doubles tournament on <strong>{EVENT.dateLabel}</strong> at{' '}
        <strong>{EVENT.venue}</strong>, {EVENT.address}. Play runs from {EVENT.timetable} on courts 8, 9 and 10
        (Philippine time).
      </p>
      <Notice tone="gold" title="Play with purpose">
        <p>
          <strong>{EVENT.charityStatement}</strong>
        </p>
      </Notice>
    </>
  )
}

export function DivisionsSection() {
  return (
    <>
      <p>
        Two divisions play, with {BRACKET_FORMAT.teamsPerBracket} pairs each. The Echelon Pickleball Organizing Committee
        reviewed registrations and assigned every pair to a division to keep the competition fair and balanced.
      </p>
      <div className="split">
        {DIVISIONS.map((division) => (
          <div key={division.id} className="card">
            <h3>{division.name}</h3>
            <p className="muted">{division.posterDescriptor}</p>
            <ol className="bracket-teams">
              {TEAMS.filter((t) => t.division === division.id).map((team) => (
                <li key={team.id}>
                  <span className="slot">{team.slot}</span>
                  <span>{teamLabel(team)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p>
        <Link to="/brackets">Search for your name →</Link>
      </p>
    </>
  )
}

export function RegistrationSection() {
  return (
    <>
      <ul className="fact-list">
        <li>
          <strong>₱{EVENT.feePhp.toLocaleString('en-PH')}</strong> per player
        </li>
        {EVENT.inclusions.map((item) => (
          <li key={item}>{item}</li>
        ))}
        <li>{EVENT.prize}</li>
        <li>
          Registration deadline: <strong>{EVENT.registrationDeadline}</strong>
        </li>
      </ul>
      <p>Registration happens on the organizer&apos;s official form, not on this website.</p>
      <p className="actions">
        <RegisterButton />
      </p>
    </>
  )
}

export function FormatSection() {
  return (
    <>
      <p>
        Each division plays one round robin: every pair plays every other pair in its division once. That is{' '}
        {BRACKET_FORMAT.preliminaryMatchesPerBracket} matches per division and{' '}
        <strong>{BRACKET_FORMAT.guaranteedMatchesPerTeam} guaranteed matches for every pair</strong>, played in five
        rounds of three matches on courts 8, 9 and 10.
      </p>
      <BracketMatrix />
      <ol className="wave-list">
        {ROUND_ROBIN_ROUNDS.map((pairs, index) => (
          <li key={index}>
            <span>Round {index + 1}</span> {pairs.map(([a, b]) => `Pair ${a} v Pair ${b}`).join(' · ')}
          </li>
        ))}
      </ol>
      <p>
        The top four pairs of each division then play the semifinals, followed by the Bronze and Gold medal matches.
      </p>
    </>
  )
}

export function ScheduleVenueSection() {
  return (
    <>
      <div className="card venue-card">
        <PinIcon />
        <div>
          <p className="venue-name">{EVENT.venue}</p>
          <p>{EVENT.address}</p>
          <p>
            <a href={EVENT.mapsUrl} target="_blank" rel="noopener noreferrer">
              Open in Maps<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
      <ul className="block-list">
        <li>
          <span>9:00 AM–1:10 PM</span>
          <strong>Round robin</strong>
          <small>Novice and Low Intermediate alternate, courts 8, 9 and 10</small>
        </li>
        <li>
          <span>1:20 PM–2:10 PM</span>
          <strong>Semifinals</strong>
          <small>Novice court 8, Low Intermediate court 10</small>
        </li>
        <li>
          <span>2:20 PM–3:10 PM</span>
          <strong>Bronze and Gold medal matches</strong>
          <small>Novice court 8, Low Intermediate court 10</small>
        </li>
        <li>
          <span>3:10 PM–3:30 PM</span>
          <strong>Awarding</strong>
          <small>All courts</small>
        </li>
      </ul>
      <p>
        <Link to="/schedule">See every match time →</Link>
      </p>
      <p>
        Qourts, the service technology provider, handles delays, match overruns and court adjustments on the day. This
        portal shows the latest officially published schedule.
      </p>
    </>
  )
}
