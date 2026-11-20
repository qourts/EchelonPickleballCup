import { useDeferredValue, useMemo, useState } from 'react'
import { DataNotice, SkippedNotice } from '../components/DataNotice.tsx'
import { SearchIcon } from '../components/icons.tsx'
import { Badge, Notice, PageHeader } from '../components/ui.tsx'
import { CATEGORIES, DIVISIONS, categoryInfo, divisionInfo } from '../config/event.ts'
import { formatManilaTime } from '../domain/schedule.ts'
import { MIN_QUERY_LENGTH, MAX_RESULTS, normalizeName, searchPlayers, type SearchHit } from '../domain/search.ts'
import { teamLabel } from '../domain/tournament.ts'
import type { Match, Team } from '../domain/types.ts'
import { useTournament } from '../hooks/useTournament.ts'
import { stageLabel } from '../components/MatchRow.tsx'

function matchesOfTeam(matches: readonly Match[], teamId: string): Match[] {
  return matches
    .filter((m) => m.teamAId === teamId || m.teamBId === teamId)
    .sort((x, y) => (x.startsAt ?? '').localeCompare(y.startsAt ?? '') || x.id.localeCompare(y.id))
}

function TeamMatches({ hit, matches, teamsById }: { hit: SearchHit; matches: readonly Match[]; teamsById: ReadonlyMap<string, Team> }) {
  const own = matchesOfTeam(matches, hit.team.id)
  if (own.length === 0) return <p className="muted">No match times published for this team yet.</p>
  return (
    <ul className="team-matches">
      {own.map((match) => {
        const opponentId = match.teamAId === hit.team.id ? match.teamBId : match.teamAId
        return (
          <li key={match.id} className={`tm is-${match.status}`}>
            <span className="tm-time">{formatManilaTime(match.startsAt)}</span>
            <span className="tm-meta">
              <span className="tm-court">{match.court ? `Court ${match.court}` : 'Court TBA'}</span>
              {match.stage === 'preliminary' ? `Round ${match.round}` : stageLabel(match)}
            </span>
            <span className="tm-opp">
              <span className="tm-vs">vs</span>
              {opponentId ? teamLabel(teamsById.get(opponentId)) : (match.teamAId === hit.team.id ? match.labelB : match.labelA) ?? 'To be decided'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function PlayerSearch({ teams, matches, teamsById }: { teams: readonly Team[]; matches: readonly Match[]; teamsById: ReadonlyMap<string, Team> }) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const hits = useMemo(() => searchPlayers(teams, deferred), [teams, deferred])
  const tooShort = normalizeName(deferred).length < MIN_QUERY_LENGTH

  return (
    <section className="search-panel" aria-labelledby="search-title">
      <h2 id="search-title">Find your team</h2>
      <label className="search-field">
        <SearchIcon />
        <span className="visually-hidden">Search by player name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by player name"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <div aria-live="polite" className="search-results">
        {query.trim() === '' && <p className="muted">Partial names work, and capital letters do not matter.</p>}
        {query.trim() !== '' && tooShort && <p className="muted">Keep typing: at least {MIN_QUERY_LENGTH} letters.</p>}
        {!tooShort && hits.length === 0 && (
          <Notice title="No players found">
            <p>
              Nothing matches &ldquo;{deferred.trim()}&rdquo;. Try fewer letters or a different spelling. If you registered
              but cannot find yourself, tell the Qourts match control desk.
            </p>
          </Notice>
        )}
        {hits.length > 0 && (
          <>
            <p className="muted">
              {hits.length === MAX_RESULTS ? `Showing the first ${MAX_RESULTS} matches. ` : ''}
              {hits.length} player{hits.length === 1 ? '' : 's'} found. Players who share a name are listed separately;
              use category, division and partner to tell them apart.
            </p>
            <ul className="hit-list">
              {hits.map((hit) => (
                <li key={`${hit.team.id}-${hit.player.id}`} className="card hit">
                  <h3>{hit.player.name}</h3>
                  <p>
                    Partner:{' '}
                    <strong>{hit.partners.length > 0 ? hit.partners.map((p) => p.name).join(' / ') : 'Not listed'}</strong>
                  </p>
                  <p className="hit-badges">
                    {CATEGORIES.length > 1 && <Badge tone="gold">{categoryInfo(hit.team.category).name}</Badge>}
                    <Badge tone="blue">{divisionInfo(hit.team.division).name}</Badge>
                    <Badge>
                      Pair {hit.team.slot}
                    </Badge>
                  </p>
                  <TeamMatches hit={hit} matches={matches} teamsById={teamsById} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function BracketBrowser({ teams }: { teams: readonly Team[] }) {
  return (
    <section className="section" aria-labelledby="browse-title">
      <h2 id="browse-title">Pairs by division</h2>
      <div className="division-columns">
        {DIVISIONS.map((division) => {
          const pairs = teams.filter((t) => t.division === division.id).sort((x, y) => x.slot - y.slot)
          return (
            <section key={division.id} className={`division-card is-${division.id}`} aria-label={division.name}>
              <div className="division-card-head">
                <h3>{division.name}</h3>
                <span>{pairs.length} pairs · round robin</span>
              </div>
              {pairs.length === 0 ? (
                <p className="muted">No pairs assigned yet.</p>
              ) : (
                <ol className="pair-list">
                  {pairs.map((team) => (
                    <li key={team.id} className="pair-card">
                      <span className="pair-no" aria-label={`Pair ${team.slot}`}>
                        {team.slot}
                      </span>
                      <span className="pair-names">
                        {team.players.map((p) => (
                          <span key={p.id}>{p.name}</span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}

export function Brackets() {
  const { roster, matches, view, skipped, reload } = useTournament()
  const teams = roster.status === 'ready' ? roster.items : null
  const published = matches.status === 'ready' ? matches.items : []

  return (
    <>
      <PageHeader
        eyebrow="Bracket assignments"
        title="Find your bracket"
        lead="Search by name to see your partner, division, bracket and published match times."
      />
      <DataNotice resource={roster} noun="bracket assignments" onRetry={reload} />
      {teams && view && (
        <>
          <SkippedNotice skipped={skipped} />
          <PlayerSearch teams={teams} matches={published} teamsById={view.teamsById} />
          <BracketBrowser teams={teams} />
          <p className="fine-print">
            Divisions are assigned by the Echelon Pickleball Organizing Committee. This page shows names and bracket
            placement only.
          </p>
        </>
      )}
    </>
  )
}
