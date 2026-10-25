import { Link } from 'react-router-dom'
import { BracketMatrix } from '../../components/BracketMatrix.tsx'
import { PinIcon } from '../../components/icons.tsx'
import { Notice, RegisterButton, TableScroll } from '../../components/ui.tsx'
import {
  BRACKETS_PER_CATEGORY,
  CATEGORIES,
  DIVISIONS,
  EVENT,
  PLANNED_BRACKETS,
  PLANNED_TEAM_POSITIONS,
} from '../../config/event.ts'
import { ROUND_ROBIN_SEQUENCE } from '../../config/rules.ts'
import { CATEGORY_BLOCKS } from '../../config/schedule.ts'
import { formatRange } from '../../domain/schedule.ts'

export function AboutSection() {
  return (
    <>
      <p>
        The {EVENT.name} is a one-day doubles tournament on <strong>{EVENT.dateLabel}</strong> at{' '}
        <strong>{EVENT.venue}</strong>, {EVENT.address}. Play runs from {EVENT.timetable} across {EVENT.courts} courts
        (Philippine time).
      </p>
      <Notice tone="gold" title="Play with purpose">
        <p>
          <strong>{EVENT.charityStatement}</strong>
        </p>
      </Notice>
      <p>
        Pickleball enthusiasts of all skill levels are invited to take part. The tournament is open to all, subject to
        category requirements, tournament eligibility, and committee assessment.
      </p>
    </>
  )
}

export function CategoriesSection() {
  return (
    <>
      <p>There are four doubles categories. Each one has three skill divisions.</p>
      <TableScroll label="Categories and pairings">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Who can pair up</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => (
              <tr key={category.id}>
                <th scope="row">{category.name}</th>
                <td>{category.pairing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <ul className="division-list">
        {DIVISIONS.map((division) => (
          <li key={division.id}>
            <strong>{division.name}</strong>
            <span>{division.posterDescriptor} (as described on the official poster)</span>
          </li>
        ))}
      </ul>
      <Notice title="How divisions are assigned">
        <p>
          The Echelon Pickleball Organizing Committee reviews registrations to promote fair and balanced competition.
          Final division placement is subject to committee assessment.
        </p>
      </Notice>
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
      <Notice tone="warn" title="One entry per player">
        <p>
          Each player may enter only once across the entire tournament, regardless of category, division or partner.
        </p>
      </Notice>
      <p>
        Registration happens on the organizer&apos;s official form, not on this website. Both partners need to be
        registered.
      </p>
      <p className="actions">
        <RegisterButton />
      </p>
    </>
  )
}

export function BracketsSection() {
  return (
    <>
      <p>
        In every category, each division is split into brackets of four teams: <strong>Novice 3 brackets</strong>,{' '}
        <strong>Low Intermediate 4 brackets</strong> and <strong>High Intermediate 3 brackets</strong>, which is{' '}
        {BRACKETS_PER_CATEGORY} brackets per category.
      </p>
      <Notice title="Planned capacity, not confirmed registrations">
        <p>
          Across the four categories the plan has {PLANNED_BRACKETS} brackets and {PLANNED_TEAM_POSITIONS} team
          positions if every bracket fills. That is the planned structure only; it says nothing about how many teams
          have actually registered.
        </p>
      </Notice>
      <h3>Single round robin: three guaranteed matches</h3>
      <p>
        Every bracket plays one round robin. Each team plays every other team in its bracket once, so a bracket has six
        matches and <strong>every team is guaranteed three matches</strong>.
      </p>
      <BracketMatrix />
      <ol className="wave-list">
        {ROUND_ROBIN_SEQUENCE.map(([a, b], index) => (
          <li key={index}>
            <span>Wave {index + 1}</span> Team {a} v Team {b}
          </li>
        ))}
      </ol>
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
      <p>Categories play one after another, three hours each, on all {EVENT.courts} courts:</p>
      <ul className="block-list">
        {CATEGORY_BLOCKS.map((block) => (
          <li key={block.category}>
            <span>{formatRange(block.startMinutes, block.endMinutes)}</span>
            <strong>{CATEGORIES.find((c) => c.id === block.category)?.name}</strong>
            <small>All three divisions</small>
          </li>
        ))}
      </ul>
      <p>
        Inside each block: six 20-minute preliminary waves, 20 minutes of tabulation and qualification, 20 minutes for
        semifinals, then a planned 20-minute window for the Gold and Bronze matches. Because medal matches have no time
        cap, that window is a target, not a guaranteed finish time.
      </p>
      <p>
        <Link to="/schedule">See the full schedule, court allocation and standard match pattern →</Link>
      </p>
      <p>
        Qourts, the service technology provider, handles delays, match overruns and court adjustments manually on the
        day. This portal shows the latest officially published schedule.
      </p>
    </>
  )
}
