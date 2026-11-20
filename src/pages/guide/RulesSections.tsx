import { ScoreConverter } from '../../components/ScoreConverter.tsx'
import { TableScroll } from '../../components/ui.tsx'
import { CONDUCT, SCORING } from '../../config/rules.ts'
import { ExampleStandings } from './ExampleStandings.tsx'

export function ScoringSection() {
  return (
    <>
      <TableScroll label="Scoring rules by match type">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">Preliminaries and semifinals</th>
              <th scope="col">Gold and Bronze</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Play to</th>
              <td>First to {SCORING.regulationTarget}</td>
              <td>First to {SCORING.medalTarget}</td>
            </tr>
            <tr>
              <th scope="row">Deuce</th>
              <td>No deuce, no two-point margin needed</td>
              <td>Deuce: win by two</td>
            </tr>
            <tr>
              <th scope="row">Time cap</th>
              <td>{SCORING.matchCapMinutes} minutes</td>
              <td>None</td>
            </tr>
            <tr>
              <th scope="row">Schedule slot</th>
              <td>{SCORING.slotMinutes} minutes</td>
              <td>Planned {SCORING.slotMinutes}-minute slot (a target only)</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>

      <h3>The 15-minute rule</h3>
      <p>When the {SCORING.matchCapMinutes}-minute cap is reached in a preliminary match or semifinal:</p>
      <ul className="rule-list">
        <li>
          <strong>Scores are unequal:</strong> the leading team wins. Its official score becomes {SCORING.regulationTarget};
          the losing team keeps its actual score. Example: <strong>8–6 becomes an official 11–6</strong>.
        </li>
        <li>
          <strong>Scores are tied:</strong> play continues until one team has at least a one-point lead. That team wins
          and its official score becomes {SCORING.regulationTarget}; the other score stays as played. Example:{' '}
          <strong>7–7 continues to 8–7, an official 11–7</strong>.
        </li>
      </ul>
      <p>
        The official adjusted score is what counts for standings: win rate, points earned (PE) and points conceded (PC)
        are all calculated from it. Original on-court scores are kept separately where the scoring system records them.
      </p>
      <ScoreConverter />
    </>
  )
}

export function StandingsSection() {
  return (
    <>
      <p>The six pairs in each division are ranked, in this order, by:</p>
      <ol className="rule-list">
        <li>
          <strong>Highest win rate</strong>
        </li>
        <li>
          <strong>Highest points earned (PE)</strong>
        </li>
        <li>
          <strong>Lowest points conceded (PC)</strong>
        </li>
      </ol>
      <p>
        If two pairs are still level, the result of their match against each other decides. Standings
        never fall back on alphabetical order, team numbers or a draw.
      </p>
      <ExampleStandings />
    </>
  )
}

export function SemifinalsSection() {
  return (
    <>
      <ul className="rule-list">
        <li>
          After the round robin, the <strong>top four pairs</strong> in each division qualify for the semifinals, seeded
          #1 to #4 by the standings above.
        </li>
        <li>
          Semifinals: <strong>Seed #1 v Seed #4</strong> and <strong>Seed #2 v Seed #3</strong>.
        </li>
        <li>Novice plays its semifinals and medal matches on court 8, Low Intermediate on court 10.</li>
      </ul>
      <p>Semifinals use the same scoring as the round robin: first to 11, no deuce, with the 15-minute rule.</p>
    </>
  )
}

export function MedalSection() {
  return (
    <>
      <p>
        Every division plays <strong>both</strong> medal matches. The <strong>Gold match</strong> is the two semifinal
        winners; the <strong>Bronze match</strong> is the two semifinal losers.
      </p>
      <ul className="rule-list">
        <li>First to {SCORING.medalTarget} points.</li>
        <li>Deuce applies: a team must win by two points.</li>
        <li>There is no match time cap and no adjusted score.</li>
      </ul>
      <p>Tournament winners receive medals.</p>
    </>
  )
}

export function ConductSection() {
  return (
    <>
      <h3>Check-in</h3>
      <p>
        Check in at least <strong>{CONDUCT.checkInLeadMinutes / 60} hour before your scheduled match</strong>.
      </p>
      <h3>Late arrival and forfeits</h3>
      <p>
        Both partners must be present and ready to play. If a team is not present within{' '}
        <strong>{CONDUCT.forfeitGraceMinutes} minutes of the scheduled start time</strong>, the match is forfeited and
        the team that is present is awarded the win.
      </p>
      <h3>Technical calls</h3>
      <p>
        Tournament officials may issue a technical call for unsportsmanlike behavior, such as disrespect toward
        opponents, partners, officials or volunteers. Please play hard, play fair and keep the spirit of the day: this
        event is for a good cause.
      </p>
    </>
  )
}
