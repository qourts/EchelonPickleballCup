import { useState } from 'react'
import { SCORING } from '../config/rules.ts'
import { normalizeTimeCapScore, ScoreError } from '../domain/scoring.ts'

function toScore(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

/** Lets players try the 15-minute rule: type the score when time is called, see the official result. */
export function ScoreConverter() {
  const [a, setA] = useState('8')
  const [b, setB] = useState('6')

  let outcome: { official: string; message: string } | { error: string }
  try {
    const result = normalizeTimeCapScore({ a: toScore(a), b: toScore(b) })
    outcome = {
      official: `${result.a}–${result.b}`,
      message: `${a}–${b} on court at the cap becomes an official ${result.a}–${result.b}. Standings count the official score.`,
    }
  } catch (error) {
    outcome = {
      error:
        error instanceof ScoreError
          ? error.message
          : 'Enter whole numbers for both teams.',
    }
  }

  return (
    <div className="card converter">
      <h3>Try the 15-minute rule</h3>
      <p>Enter the score when time is called (or the score once a tied game has been played on to a one-point lead).</p>
      <div className="converter-fields">
        <label>
          <span>Team A score</span>
          <input type="number" inputMode="numeric" min={0} max={SCORING.regulationTarget} value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label>
          <span>Team B score</span>
          <input type="number" inputMode="numeric" min={0} max={SCORING.regulationTarget} value={b} onChange={(e) => setB(e.target.value)} />
        </label>
      </div>
      <div className="converter-result" aria-live="polite">
        {'error' in outcome ? (
          <p className="converter-error">{outcome.error}</p>
        ) : (
          <>
            <p className="converter-official">
              <span className="converter-label">Official score</span>
              <strong>{outcome.official}</strong>
            </p>
            <p>{outcome.message}</p>
          </>
        )}
      </div>
    </div>
  )
}
