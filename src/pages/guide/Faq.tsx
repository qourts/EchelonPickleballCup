import type { ReactNode } from 'react'
import { EVENT } from '../../config/event.ts'
import { PHASE_OPENS_LABEL } from '../../config/publication.ts'
import { CONDUCT, SCORING } from '../../config/rules.ts'

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
    answer: 'Five. Each division of six pairs plays a single round robin, so every pair meets every other pair in its division once before the semifinals.',
  },
  {
    question: 'What happens if my match is not finished after 15 minutes?',
    answer: `In a preliminary match or semifinal, the team ahead wins and its official score becomes ${SCORING.regulationTarget}; the other team keeps its actual score (8–6 becomes 11–6). If the score is tied, play continues until one team leads (7–7 played on to 8–7 is an official 11–7).`,
  },
  {
    question: 'Do the Gold and Bronze matches have a time limit?',
    answer: 'No. They are first to 11, win by two, with no time cap. The planned 25-minute slot is a scheduling target, not a deadline.',
  },
  {
    question: 'What if two pairs are tied after win rate, PE and PC?',
    answer: 'The result of their match against each other decides.',
  },
  {
    question: 'How do I know which division I will play in?',
    answer: 'The Echelon Pickleball Organizing Committee reviews registrations and assigns divisions to promote fair, balanced competition. Final placement is subject to committee assessment.',
  },
  {
    question: 'When do standings and results appear?',
    answer: `Pairs and match times are already published. Live scores, standings and playoffs open on ${PHASE_OPENS_LABEL[3]} at 12:00 AM Philippine time and update during play.`,
  },
  {
    question: 'When do I need to check in?',
    answer: `At least ${CONDUCT.checkInLeadMinutes / 60} hour before your scheduled match.`,
  },
  {
    question: 'What if my partner or I am late?',
    answer: `If a team is not present within ${CONDUCT.forfeitGraceMinutes} minutes of the scheduled start time, the match is forfeited and the team that is present is awarded the win.`,
  },
  {
    question: 'What is a technical call?',
    answer: 'A call by tournament officials for unsportsmanlike behavior.',
  },
  {
    question: 'What is the registration deadline?',
    answer: `${EVENT.registrationDeadline}. Registration closes after that date; the organizers have not published a cut-off time of day.`,
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
