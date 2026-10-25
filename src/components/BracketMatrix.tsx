import { ROUND_ROBIN_SEQUENCE } from '../config/rules.ts'

/** Who plays whom, and in which wave, in a four-team bracket. */
export function BracketMatrix() {
  const waveFor = (x: number, y: number): number | null => {
    const index = ROUND_ROBIN_SEQUENCE.findIndex(([a, b]) => (a === x && b === y) || (a === y && b === x))
    return index === -1 ? null : index + 1
  }
  const teams = [1, 2, 3, 4]
  return (
    <div className="table-scroll" role="region" aria-label="Round robin wave for each pair of teams" tabIndex={0}>
      <table className="data-table matrix">
        <caption>Wave in which each pair of teams meets</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Team</span>
            </th>
            {teams.map((t) => (
              <th key={t} scope="col">
                Team {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((row) => (
            <tr key={row}>
              <th scope="row">Team {row}</th>
              {teams.map((col) => {
                const wave = row === col ? null : waveFor(row, col)
                return (
                  <td key={col} className={row === col ? 'is-self' : undefined}>
                    {row === col ? '–' : `Wave ${wave}`}
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
