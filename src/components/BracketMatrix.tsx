import { BRACKET_FORMAT, ROUND_ROBIN_SEQUENCE } from '../config/rules.ts'

/** Who plays whom, and in which round, in a round-robin group. */
export function BracketMatrix() {
  const roundFor = (x: number, y: number): number | null => {
    const index = ROUND_ROBIN_SEQUENCE.findIndex(([a, b]) => (a === x && b === y) || (a === y && b === x))
    return index === -1 ? null : Math.floor(index / 3) + 1
  }
  const teams = Array.from({ length: BRACKET_FORMAT.teamsPerBracket }, (_, i) => i + 1)
  return (
    <div className="table-scroll" role="region" aria-label="Round in which each two pairs meet" tabIndex={0}>
      <table className="data-table matrix">
        <caption>Round in which each two pairs meet</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Team</span>
            </th>
            {teams.map((t) => (
              <th key={t} scope="col">
                Pair {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row}>
              <th scope="row">Pair {row}</th>
              {teams.map((col) => {
                const round = row === col ? null : roundFor(row, col)
                return (
                  <td key={col} className={row === col ? 'is-self' : undefined}>
                    {row === col ? '–' : `R${round}`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
