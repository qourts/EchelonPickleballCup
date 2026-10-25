import { useState } from 'react'
import { SegmentedControl } from './ui.tsx'

type Origin = 'different' | 'same'

interface Slot {
  readonly label: string
  readonly wildcard?: boolean
}

const PAIRINGS: Record<Origin, readonly (readonly [Slot, Slot])[]> = {
  different: [
    [{ label: 'Seed #1' }, { label: 'Seed #4', wildcard: true }],
    [{ label: 'Seed #2' }, { label: 'Seed #3' }],
  ],
  same: [
    [{ label: 'Seed #1' }, { label: 'Seed #3' }],
    [{ label: 'Seed #2' }, { label: 'Seed #4', wildcard: true }],
  ],
}

function SlotChip({ slot }: { slot: Slot }) {
  return (
    <span className={`slot-chip${slot.wildcard ? ' is-wildcard' : ''}`}>
      {slot.label}
      {slot.wildcard && <small>wildcard</small>}
    </span>
  )
}

/** Interactive illustration of semifinal pairings for divisions that send a wildcard. */
export function SemifinalDiagram() {
  const [origin, setOrigin] = useState<Origin>('different')
  return (
    <div className="card diagram">
      <h3>Semifinal pairings (Novice and High Intermediate)</h3>
      <SegmentedControl<Origin>
        label="Where the wildcard came from"
        value={origin}
        onChange={setOrigin}
        options={[
          { value: 'different', label: 'Wildcard from another bracket than Seed #1' },
          { value: 'same', label: 'Wildcard from Seed #1’s bracket' },
        ]}
      />
      <div className="diagram-grid" aria-live="polite">
        {PAIRINGS[origin].map(([x, y], index) => (
          <div key={index} className="diagram-semi">
            <p className="diagram-title">Semifinal {index + 1}</p>
            <div className="diagram-pair">
              <SlotChip slot={x} />
              <span className="diagram-vs">vs</span>
              <SlotChip slot={y} />
            </div>
          </div>
        ))}
        <div className="diagram-final">
          <p>
            <strong>Gold match:</strong> winner v winner
          </p>
          <p>
            <strong>Bronze match:</strong> loser v loser
          </p>
        </div>
      </div>
      <p className="fine-print">
        {origin === 'same'
          ? 'Seed #1 and the wildcard already met in the preliminary round, so the pairings switch to avoid an immediate rematch.'
          : 'This is the standard pairing: Seed #1 v Seed #4 and Seed #2 v Seed #3.'}
      </p>
    </div>
  )
}
