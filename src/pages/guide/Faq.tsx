import type { ReactNode } from 'react'
import { EVENT } from '../../config/event.ts'
import { PHASE_OPENS_LABEL } from '../../config/publication.ts'
import { SCORING } from '../../config/rules.ts'

interface FaqItem {
  readonly question: string
  readonly answer: ReactNode
}

const ITEMS: readonly FaqItem[] = [
  {
    question: 'Can I enter more than once?',
    answer: 'No. Each player is allowed one entry across the whole tournament, whatever the category, division or partner.',
  },
  {
    question: 'What do I get for my registration fee?',
    answer: `The fee is ₱${EVENT.feePhp.toLocaleString('en-PH')} per player. Each registered player receives one tournament jersey and one meal. Tournament winners receive medals.`,
  },
  {
    question: 'How many matches am I guaranteed?',
    answer: 'Three. Every four-team bracket plays a single round robin, so each team meets every other team in its bracket once before the semifinals.',
  },
  {
    question: 'What happens if my match is not finished after 15 minutes?',
    answer: `In a preliminary match or semifinal, the team ahead wins and its official score becomes ${SCORING.regulationTarget}; the other team keeps its actual score (8–6 becomes 11–6). If the score is tied, play continues until one team leads (7–7 played on to 8–7 is an official 11–7).`,
  },
  {
    question: 'Do the Gold and Bronze matches have a time limit?',
    answer: 'No. They are first to 11, win by two, with no time cap. The planned 20-minute window is a scheduling target, not a deadline.',
  },
  {
    question: 'Why is the wildcard always Seed #4?',
    answer: 'The wildcard is the best second-place team, chosen only against the other second-place teams. It is placed at Seed #4 even if its record is stronger than a bracket winner’s.',
  },
  {
    question: 'What if two teams are tied after win rate, PE and PC?',
    answer: `Within a bracket, head-to-head decides a two-team tie. Between brackets, teams play a tiebreaker: one match to ${SCORING.tiebreakerTarget} for two teams, or a mini round robin for three. These matches never change preliminary statistics.`,
  },
  {
    question: 'How do I know which division I will play in?',
    answer: 'The Echelon Pickleball Organizing Committee reviews registrations and assigns divisions to promote fair, balanced competition. Final placement is subject to committee assessment.',
  },
  {
    question: 'When will I find out my bracket and schedule?',
    answer: `Bracket assignments and player search open on ${PHASE_OPENS_LABEL[2]} at 12:00 AM Philippine time. Standings and playoffs open on ${PHASE_OPENS_LABEL[3]} at 12:00 AM.`,
  },
  {
    question: 'Can I register on this website?',
    answer: 'No. This portal is public and read-only. Registration uses the organizer’s official form, and tournament administration is handled outside this website.',
  },
  {
    question: 'What if matches run late?',
    answer: 'Qourts, the service technology provider, manages delays, overruns and court adjustments manually. This portal reflects the latest officially published schedule and match status.',
  },
]

export function Faq() {
  return (
    <div className="faq">
      {ITEMS.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
