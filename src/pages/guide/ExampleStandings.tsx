import { roundRobinPairings } from '../../domain/roundRobin.ts'
import { rankBracket } from '../../domain/standings.ts'
import type { Match, Score } from '../../domain/types.ts'
import { TableScroll } from '../../components/ui.tsx'

const IDS = ['Team 1', 'Team 2', 'Team 3', 'Team 4']

// Official scores by wave. Wave 1 was 8-6 on court when time was called (official 11-6).
const OFFICIAL: readonly Score[] = [
  { a: 11, b: 6 },
  { a: 11, b: 8 },
  { a: 11, b: 8 },
  { a: 11, b: 7 },
  { a: 6, b: 11 },
  { a: 7, b: 11 },
]

const matches: Match[] = roundRobinPairings(IDS).map((p, i) => ({
  id: `example-${p.round}`,
  stage: 'preliminary',
  category: 'genderless',
  division: 'novice',
  court: null,
  startsAt: null,
  teamAId: p.teamA,
  teamBId: p.teamB,
  status: 'completed',
  ...(i === 0 ? { onCourt: { a: 8, b: 6 }, capReached: true } : { official: OFFICIAL[i] }),
}))

/** A worked example computed with the same ranking code the portal uses. */
export function ExampleStandings() {
  const standing = rankBracket(IDS, matches)
  return (
    <div className="card">
      <h3>Worked example (illustration only)</h3>
      <p>
        Teams 1 and 2 both finish 2–1 with 28 points earned and 25 conceded, so win rate, PE and PC cannot separate
        them. Team 1 beat Team 2 in wave 1 (8–6 on court at the cap, an official 11–6), so Team 1 ranks first.
      </p>
      <TableScroll label="Worked example standings">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              <th scope="col">W–L</th>
              <th scope="col">PE</th>
              <th scope="col">PC</th>
              <th scope="col">Decided by</th>
            </tr>
          </thead>
          <tbody>
            {standing.rows.map((row) => (
              <tr key={row.teamId}>
                <td>{row.rank}</td>
                <td>{row.teamId}</td>
                <td>
                  {row.record.wins}–{row.record.losses}
                </td>
                <td>{row.record.pe}</td>
                <td>{row.record.pc}</td>
                <td>{row.tie === 'head-to-head' ? 'Head-to-head' : 'Win rate, PE, PC'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </div>
  )
}
