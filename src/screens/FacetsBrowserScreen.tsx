import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Facet } from '@/db/types'
import { FacetRepo } from '@/repos/FacetRepo'
import './FacetsBrowserScreen.css'

type FacetWithCount = Facet & { count: number }

export function FacetsBrowserScreen() {
  const [facets, setFacets] = useState<FacetWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    FacetRepo.getWithCounts().then((fs) => {
      setFacets(fs)
      setLoading(false)
    })
  }, [])

  const handleFacetClick = (facetId: string) => {
    // Navigate home with facet filter pre-applied via query param
    navigate(`/?facet=${facetId}`)
  }

  if (loading) return <div className="screen"><div className="facets-empty">Loading…</div></div>

  // Group by type
  const grouped: Record<string, FacetWithCount[]> = {}
  for (const f of facets) {
    const key = f.type ?? ''
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  }

  const groups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="facets-title">Facets</h1>
        <p className="muted facets-subtitle">{facets.length} tag{facets.length !== 1 ? 's' : ''} · tap to filter</p>
      </div>

      <div className="screen-body">
        {facets.length === 0 ? (
          <div className="facets-empty">No facets yet. Add people and tag them!</div>
        ) : (
          groups.map(([type, fs]) => (
            <div key={type || '__none'} className="facets-group">
              {type && <h2 className="facets-group-title">{type}</h2>}
              <div className="facets-group-list">
                {fs.map((f) => (
                  <button
                    key={f.id}
                    className="facets-item"
                    onClick={() => handleFacetClick(f.id)}
                  >
                    <span className="facets-item-label">{f.label}</span>
                    <span className="facets-item-count">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
