import { useEffect, useState, type ReactNode } from 'react'
import { PageHeader } from '../components/ui.tsx'
import { Faq } from './guide/Faq.tsx'
import {
  AboutSection,
  DivisionsSection,
  FormatSection,
  RegistrationSection,
  ScheduleVenueSection,
} from './guide/FormatSections.tsx'
import {
  MedalSection,
  ScoringSection,
  SemifinalsSection,
  StandingsSection,
  ConductSection,
} from './guide/RulesSections.tsx'

interface GuideSection {
  readonly id: string
  readonly label: string
  readonly title: string
  readonly body: ReactNode
}

const SECTIONS: readonly GuideSection[] = [
  { id: 'about', label: 'About', title: 'What this tournament is about', body: <AboutSection /> },
  { id: 'divisions', label: 'Divisions', title: 'Divisions and pairs', body: <DivisionsSection /> },
  { id: 'registration', label: 'Registration', title: 'Registration, fee and entry limit', body: <RegistrationSection /> },
  { id: 'format', label: 'Format', title: 'Round robin and guaranteed matches', body: <FormatSection /> },
  { id: 'scoring', label: 'Scoring', title: 'Match scoring and the 15-minute rule', body: <ScoringSection /> },
  { id: 'standings', label: 'Standings', title: 'Standings and rankings', body: <StandingsSection /> },
  { id: 'semifinals', label: 'Semifinals', title: 'Semifinals and seeding', body: <SemifinalsSection /> },
  { id: 'medals', label: 'Medals', title: 'Gold and Bronze matches', body: <MedalSection /> },
  { id: 'conduct', label: 'Check-in & conduct', title: 'Check-in, forfeits and technical calls', body: <ConductSection /> },
  { id: 'venue', label: 'Schedule & venue', title: 'Event schedule and venue', body: <ScheduleVenueSection /> },
  { id: 'faq', label: 'FAQ', title: 'Quick answers', body: <Faq /> },
]

const SECTION_IDS = SECTIONS.map((s) => s.id)

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -65% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])
  return active
}

export function Guide() {
  const active = useActiveSection(SECTION_IDS)

  const jump = (id: string) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <>
      <PageHeader
        eyebrow="Player Guide"
        title="Everything you need to play"
        lead="The rules, formats and schedule for the Echelon Pickleball Cup 2026, written for players."
      />
      <div className="guide-layout">
        <nav className="guide-toc" aria-label="Guide sections">
          <ul>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className="toc-chip"
                  aria-current={active === section.id ? 'true' : undefined}
                  onClick={() => jump(section.id)}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="guide-content">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="guide-section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
