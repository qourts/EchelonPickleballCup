import { useMemo } from 'react'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { MatchRow } from '../components/MatchRow.tsx'
import { Badge, Notice, PageHeader, SegmentedControl, TableScroll } from '../components/ui.tsx'
import { CATEGORIES, DIVISIONS, EVENT, categoryInfo, divisionInfo } from '../config/event.ts'
import { BLOCK_PATTERN, CATEGORY_BLOCKS, PLAYOFF_COURTS, PRELIMINARY_COURTS } from '../config/schedule.ts'
import { ROUND_ROBIN_SEQUENCE } from '../config/rules.ts'
import { formatRange, timelineFor } from '../domain/schedule.ts'
import { isSectionPublished } from '../domain/publication.ts'
import type { CategoryId, Match } from '../domain/types.ts'
import { usePortal } from '../hooks/portalContext.ts'
import { useQueryParam } from '../hooks/useQueryParam.ts'
import { useTournament } from '../hooks/useTournament.ts'

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
const DIVISION_FILTERS = ['all', ...DIVISIONS.map((d) => d.id)] as const

const SEGMENT_LABEL = {
  wave: 'Preliminary wave',
  tabulation: 'Tabulation and qualification',
  semifinals: 'Semifinals',
  medals: 'Gold and Bronze matches (planned window)',
} as const

function BlockOverview() {
  return (
    <section className="section" aria-labelledby="blocks">
      <h2 id="blocks">Tournament day: {EVENT.dateLabel}</h2>
      <p>
        {EVENT.timetable}, Philippine time, on {EVENT.courts} courts at {EVENT.venue}. Each category has a three-hour
        block covering all three divisions.
      </p>
      <ol className="block-grid">
        {CATEGORY_BLOCKS.map((block) => (
          <li key={block.category} className="card block-card">
            <p className="block-time">{formatRange(block.startMinutes, block.endMinutes)}</p>
            <p className="block-name">{categoryInfo(block.category).name}</p>
            <p>All three divisions</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function BlockPattern() {
  const [categoryId, setCategoryId] = useQueryParam<CategoryId>('block', CATEGORY_IDS, 'genderless')
  const block = CATEGORY_BLOCKS.find((b) => b.category === categoryId) ?? CATEGORY_BLOCKS[0]!
  const timeline = timelineFor(block)

  return (
    <section className="section" aria-labelledby="pattern">
      <h2 id="pattern">Inside each block</h2>
      <p>Every category block follows the same pattern. Pick a category to see its clock times.</p>
      <SegmentedControl<CategoryId>
        label="Category block"
        value={categoryId}
        onChange={setCategoryId}
        options={CATEGORIES.map((c) => ({ value: c.id, label: c.short }))}
      />
      <TableScroll label="Standard block timeline">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">What happens</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((segment) => (
              <tr key={`${segment.kind}-${segment.wave ?? ''}`}>
                <td>{formatRange(segment.startMinutes, segment.endMinutes)}</td>
                <td>
                  {segment.kind === 'wave' ? `Wave ${segment.wave}: ` : ''}
                  {SEGMENT_LABEL[segment.kind]}
                  {segment.kind === 'wave' && (
                    <small className="muted">
                      {' '}
                      · Team {ROUND_ROBIN_SEQUENCE[(segment.wave ?? 1) - 1]?.[0]} v Team{' '}
                      {ROUND_ROBIN_SEQUENCE[(segment.wave ?? 1) - 1]?.[1]}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine-print">
        Medal matches have no time cap, so their 20-minute window ({BLOCK_PATTERN.at(-1)?.durationMinutes} minutes) is a
        scheduling target, not a guaranteed finish time. Check in at least one hour before your match; a team that is
        not present within 5 minutes of the scheduled start forfeits. Delays and court changes are handled manually by Qourts and
        appear here once officially published.
      </p>
    </section>
  )
}

function CourtAllocation() {
  return (
    <section className="section" aria-labelledby="courts">
      <h2 id="courts">Court allocation</h2>
      <TableScroll label="Court allocation by division">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Division</th>
              <th scope="col">Preliminary courts</th>
              <th scope="col">Semifinals</th>
              <th scope="col">Gold</th>
              <th scope="col">Bronze</th>
            </tr>
          </thead>
          <tbody>
            {[...DIVISIONS].reverse().map((division) => {
              const courts = PRELIMINARY_COURTS[division.id]
              const playoff = PLAYOFF_COURTS[division.id]
              return (
                <tr key={division.id}>
                  <th scope="row">{division.name}</th>
                  <td>
                    {courts.map((court, i) => `Court ${court} (Bracket ${division.brackets[i]})`).join(', ')}
                  </td>
                  <td>
                    Court {playoff.semifinalOneVsFour} (#1 v #4), Court {playoff.semifinalTwoVsThree} (#2 v #3)
                  </td>
                  <td>Court {playoff.gold}</td>
                  <td>Court {playoff.bronze}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="fine-print">
        Semifinal and medal courts follow the official reference matrix. In a division that sends a wildcard and the
        same-bracket exception applies, the pairings change but the courts stay as listed.
      </p>
    </section>
  )
}

function PublishedMatches() {
  const { phase, now } = usePortal()
  const { roster, matches, view, skipped, reload } = useTournament()
  const blockNow = CATEGORY_BLOCKS.find((b) => {
    const minutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 8 * 60) % (24 * 60)
    return minutes >= b.startMinutes && minutes < b.endMinutes
  })
  const [categoryId, setCategoryId] = useQueryParam<CategoryId>('cat', CATEGORY_IDS, blockNow?.category ?? 'genderless')
  const [divisionFilter, setDivisionFilter] = useQueryParam<(typeof DIVISION_FILTERS)[number]>('div', DIVISION_FILTERS, 'all')

  const rows = useMemo<Match[]>(() => {
    if (matches.status !== 'ready') return []
    return matches.items
      .filter((m) => m.category === categoryId && (divisionFilter === 'all' || m.division === divisionFilter))
      .slice()
      .sort(
        (x, y) =>
          (x.startsAt ?? '').localeCompare(y.startsAt ?? '') ||
          (x.court ?? 99) - (y.court ?? 99) ||
          x.id.localeCompare(y.id),
      )
  }, [matches, categoryId, divisionFilter])

  if (!isSectionPublished('brackets', phase)) {
    return (
      <Notice title="Match-by-match schedule">
        <p>
          The published match schedule, with team names, courts and times, opens with bracket assignments on
          November 18, 2026 at 12:00 AM Philippine time.
        </p>
      </Notice>
    )
  }

  const groups = new Map<string, Match[]>()
  for (const match of rows) {
    const key = match.startsAt ?? 'tba'
    groups.set(key, [...(groups.get(key) ?? []), match])
  }

  return (
    <section className="section" aria-labelledby="published">
      <h2 id="published">Published match schedule</h2>
      <SkippedNotice skipped={skipped} />
      <div className="filters">
        <SegmentedControl<CategoryId>
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={CATEGORIES.map((c) => ({ value: c.id, label: c.short }))}
        />
        <SegmentedControl<(typeof DIVISION_FILTERS)[number]>
          label="Division"
          value={divisionFilter}
          onChange={setDivisionFilter}
          options={[{ value: 'all', label: 'All' }, ...DIVISIONS.map((d) => ({ value: d.id, label: d.short }))]}
        />
      </div>
      <DataNotice resource={matches} noun="the match schedule" onRetry={reload} />
      {matches.status === 'ready' && roster.status !== 'ready' && (
        <DataNotice resource={roster} noun="team names" onRetry={reload} />
      )}
      {matches.status === 'ready' && rows.length === 0 && (
        <Notice title="No matches yet">
          <p>
            No {categoryInfo(categoryId).name} matches
            {divisionFilter === 'all' ? '' : ` for ${divisionInfo(divisionFilter).name}`} have been published.
          </p>
        </Notice>
      )}
      {[...groups.entries()].map(([key, group]) => (
        <div key={key} className="match-group">
          <ul className="match-list">
            {group.map((match) => (
              <li key={match.id}>
                <MatchRow match={match} teamsById={view?.teamsById ?? new Map()} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {phase >= 3 && matches.status === 'ready' && (
        <p className="fine-print">
          <Badge tone="live">Live</Badge> This list refreshes automatically while you keep the page open.
        </p>
      )}
    </section>
  )
}

export function Schedule() {
  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Saturday, November 21"
        lead="Four category blocks, ten courts, one long day of pickleball for a good cause."
      />
      <BlockOverview />
      <PublishedMatches />
      <BlockPattern />
      <CourtAllocation />
    </>
  )
}
