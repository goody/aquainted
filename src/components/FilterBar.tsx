import { useEffect, useState } from 'react'
import { FacetRepo } from '@/repos/FacetRepo'
import type { Facet } from '@/db/types'
import { FacetChip } from './FacetChip'
import './FilterBar.css'

interface Props {
  activeFacetIds: string[]
  andMode: boolean
  onRemoveFacet: (id: string) => void
  onClearAll: () => void
  onToggleMode: () => void
}

export function FilterBar({ activeFacetIds, andMode, onRemoveFacet, onClearAll, onToggleMode }: Props) {
  const [facets, setFacets] = useState<Facet[]>([])

  useEffect(() => {
    if (activeFacetIds.length === 0) {
      setFacets([])
      return
    }
    FacetRepo.getByIds(activeFacetIds).then(setFacets)
  }, [activeFacetIds])

  if (activeFacetIds.length === 0) return null

  return (
    <div className="filter-bar">
      <div className="filter-chips">
        {facets.map((f) => (
          <FacetChip
            key={f.id}
            facet={f}
            variant="filter"
            active
            onRemove={() => onRemoveFacet(f.id)}
          />
        ))}
      </div>
      <div className="filter-actions">
        <button className="filter-mode-btn" onClick={onToggleMode} title="Toggle AND/OR">
          {andMode ? 'AND' : 'OR'}
        </button>
        <button className="filter-clear-btn" onClick={onClearAll}>
          Clear
        </button>
      </div>
    </div>
  )
}
