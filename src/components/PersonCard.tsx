import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Facet, Person } from '@/db/types'
import { FacetRepo } from '@/repos/FacetRepo'
import { LinkRepo } from '@/repos/LinkRepo'
import { FacetChip } from './FacetChip'
import './PersonCard.css'

interface Props {
  person: Person
  onFacetClick: (facetId: string) => void
}

export function PersonCard({ person, onFacetClick }: Props) {
  const [pinnedFacets, setPinnedFacets] = useState<Facet[]>([])
  const [extraCount, setExtraCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const allFacetIds = await LinkRepo.getFacetIdsForPerson(person.id)
      const pinnedIds = person.pinnedFacetIds?.filter((id) => allFacetIds.includes(id)) ?? []

      // Show pinned first, then up to 3 more
      const displayIds = pinnedIds.length > 0 ? pinnedIds : allFacetIds.slice(0, 3)
      const shown = displayIds.slice(0, 4)
      const extra = allFacetIds.length - shown.length

      const facets = shown.length > 0 ? await FacetRepo.getByIds(shown) : []
      // preserve order
      const ordered = shown.map((id) => facets.find((f) => f.id === id)!).filter(Boolean)
      setPinnedFacets(ordered)
      setExtraCount(extra)
    }
    load()
  }, [person])

  return (
    <div className="person-card" onClick={() => navigate(`/person/${person.id}`)}>
      <div className="person-card-name">{person.name}</div>
      {pinnedFacets.length > 0 && (
        <div className="person-card-chips">
          {pinnedFacets.map((f) => (
            <span key={f.id} onClick={(e) => { e.stopPropagation(); onFacetClick(f.id) }}>
              <FacetChip
                facet={f}
                variant="card"
                onClick={() => onFacetClick(f.id)}
              />
            </span>
          ))}
          {extraCount > 0 && <span className="person-card-more">+{extraCount}</span>}
        </div>
      )}
    </div>
  )
}
