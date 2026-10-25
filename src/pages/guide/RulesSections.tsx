import { ScoreConverter } from '../../components/ScoreConverter.tsx'
import { SemifinalDiagram } from '../../components/SemifinalDiagram.tsx'
import { Notice, TableScroll } from '../../components/ui.tsx'
import { SCORING } from '../../config/rules.ts'
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
              <td>
                {SCORING.slotMinutes} minutes ({SCORING.matchCapMinutes} play + {SCORING.transitionMinutes} transition)
              </td>
              <td>Planned {SCORING.slotMinutes}-minute window (a target only)</td>
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
      <p>Teams in each bracket are ranked, in this order, by:</p>
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
        If two teams in a bracket are still level, the result of their match against each other decides. Standings
        never fall back on alphabetical order, team numbers or a draw. Ties of three or more teams inside one bracket
        have no published procedure yet; if one happens, the organizers will announce how it is settled.
      </p>
      <ExampleStandings />
    </>
  )
}

export function SemifinalsSection() {
  return (
    <>
      <h3>Novice and High Intermediate (three brackets)</h3>
      <ul className="rule-list">
        <li>
          The <strong>first-place team from each bracket</strong> qualifies. These three are seeded #1, #2 and #3 by win
          rate, then PE, then PC.
        </li>
        <li>
          One <strong>wildcard</strong> also qualifies: the best second-place team of the three brackets. It is chosen by
          comparing only the three second-place teams&apos; preliminary records (win rate, then PE, then PC).
        </li>
        <li>
          The wildcard is always <strong>Seed #4</strong>, even if its record is better than a bracket winner&apos;s.
        </li>
        <li>
          Semifinals: <strong>Seed #1 v Seed #4</strong> and <strong>Seed #2 v Seed #3</strong>.
        </li>
        <li>
          <strong>Exception:</strong> if Seed #1 and the wildcard come from the same preliminary bracket, the pairings
          become <strong>Seed #1 v Seed #3</strong> and <strong>Seed #2 v Seed #4</strong>, so they do not meet again
          straight away.
        </li>
      </ul>
      <SemifinalDiagram />
      <h3>Low Intermediate (four brackets)</h3>
      <p>
        Only the <strong>first-place team from each of the four brackets</strong> advances. They are seeded #1 to #4 by
        win rate, then PE, then PC, and play <strong>Seed #1 v Seed #4</strong> and <strong>Seed #2 v Seed #3</strong>.
        There is no wildcard in Low Intermediate.
      </p>
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

export function TiebreakerSection() {
  return (
    <>
      <p>
        When teams from different brackets are still level on win rate, PE and PC (when seeding bracket winners or
        choosing the wildcard), the tie is settled on court with supplemental tiebreaker matches. Every tiebreaker match
        is <strong>first to {SCORING.tiebreakerTarget}, no deuce, no time cap</strong>.
      </p>
      <ul className="rule-list">
        <li>
          <strong>Two teams tied:</strong> one deciding match.
        </li>
        <li>
          <strong>Three teams tied:</strong> a mini round robin where each team plays the other two once. It is ranked by
          most tiebreaker wins, then highest tiebreaker PE, then lowest tiebreaker PC. If a tie still remains, further
          race-to-{SCORING.tiebreakerTarget} deciding matches are played.
        </li>
      </ul>
      <p>
        Tiebreaker results are kept separate: they never change a team&apos;s preliminary win rate, PE or PC.
      </p>
      <Notice title="Ties of four or more teams">
        <p>
          The procedure for a tie among four or more teams has not been specified. It is pending an official organizer
          decision and will not be improvised.
        </p>
      </Notice>
    </>
  )
}
