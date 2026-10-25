import { NavLink } from 'react-router-dom'
import { CATEGORIES, DIVISIONS } from '../config/event.ts'
import type { CategoryId, DivisionId } from '../domain/types.ts'
import { useQueryParam } from '../hooks/useQueryParam.ts'
import { SegmentedControl } from './ui.tsx'

const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
const DIVISION_IDS = DIVISIONS.map((d) => d.id)

/** Category and division filters kept in the URL. Returns the current choice. */
export function useDivisionChoice() {
  const [category, setCategory] = useQueryParam<CategoryId>('cat', CATEGORY_IDS, 'genderless')
  const [division, setDivision] = useQueryParam<DivisionId>('div', DIVISION_IDS, 'novice')
  return { category, division, setCategory, setDivision }
}

export function DivisionPicker({ category, division, setCategory, setDivision }: ReturnType<typeof useDivisionChoice>) {
  return (
    <div className="filters">
      <SegmentedControl<CategoryId>
        label="Category"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c.id, label: c.short }))}
      />
      <SegmentedControl<DivisionId>
        label="Division"
        value={division}
        onChange={setDivision}
        options={DIVISIONS.map((d) => ({ value: d.id, label: d.short }))}
      />
    </div>
  )
}

export function ResultsTabs() {
  return (
    <nav className="results-tabs" aria-label="Results">
      <NavLink to="/standings" className="results-tab">
        Standings
      </NavLink>
      <NavLink to="/playoffs" className="results-tab">
        Playoffs
      </NavLink>
    </nav>
  )
}
