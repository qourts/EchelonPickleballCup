import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PHASE_OPENS_LABEL, SECTION_MIN_PHASE, type PortalSection } from '../config/publication.ts'
import { isSectionPublished } from '../domain/publication.ts'
import { usePortal } from '../hooks/portalContext.ts'
import { LockIcon } from './icons.tsx'
import { PageHeader } from './ui.tsx'

const TITLES: Partial<Record<PortalSection, string>> = {
  brackets: 'Brackets & player search',
  live: 'Live & upcoming',
  standings: 'Standings',
  playoffs: 'Playoffs',
}

/**
 * Shows a section only once it is published. This is a convenience for visitors; the data
 * itself is protected by the data source, which will not serve it before its phase opens.
 */
export function Gated({ section, children }: { section: PortalSection; children: ReactNode }) {
  const { phase } = usePortal()
  if (isSectionPublished(section, phase)) return <>{children}</>
  const minPhase = SECTION_MIN_PHASE[section]
  const opens = minPhase === 2 || minPhase === 3 ? PHASE_OPENS_LABEL[minPhase] : null
  return (
    <>
      <PageHeader eyebrow="Not open yet" title={TITLES[section] ?? 'Coming soon'} />
      <div className="locked-card">
        <LockIcon />
        <div>
          <p className="locked-title">{opens ? `Opens ${opens}, 12:00 AM Philippine time` : 'Opens soon'}</p>
          <p>
            This part of the portal is published in stages. Until then, the Player Guide and the tournament-day
            schedule have everything you need to prepare.
          </p>
          <p className="actions">
            <Link className="button button-primary" to="/guide">
              Read the Player Guide
            </Link>
            <Link className="button button-ghost" to="/schedule">
              See the schedule
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
