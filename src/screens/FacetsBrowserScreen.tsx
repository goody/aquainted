import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Facet } from '@/db/types'
import { FacetRepo } from '@/repos/FacetRepo'
import { normalizeFacet } from '@/services/facetNormalize'
import './FacetsBrowserScreen.css'

type FacetWithCount = Facet & { count: number }

export function FacetsBrowserScreen() {
  const [facets, setFacets] = useState<FacetWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editError, setEditError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    FacetRepo.getWithCounts().then((fs) => {
      setFacets(fs)
      setLoading(false)
    })
  }, [])

  const handleFacetClick = (facetId: string) => {
    navigate(`/?facet=${facetId}`)
  }

  const handleEditStart = (f: FacetWithCount) => {
    setEditingId(f.id)
    setEditingLabel(f.label)
    setEditError('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingLabel('')
    setEditError('')
  }

  const handleEditSave = async (f: FacetWithCount) => {
    const trimmed = editingLabel.trim()
    if (!trimmed) {
      setEditError('Label cannot be empty.')
      return
    }
    const newKey = normalizeFacet(trimmed, f.type)
    if (newKey !== f.normalizedKey) {
      const existing = await FacetRepo.getByNormalizedKey(newKey)
      if (existing) {
        setEditError(`"${existing.label}" already exists.`)
        return
      }
    }
    await FacetRepo.update(f.id, { label: trimmed, normalizedKey: newKey })
    setFacets((prev) =>
      prev.map((x) => (x.id === f.id ? { ...x, label: trimmed, normalizedKey: newKey } : x))
    )
    setEditingId(null)
    setEditingLabel('')
    setEditError('')
  }

  const handleDelete = async (f: FacetWithCount) => {
    const msg = `Delete "${f.label}"? This will remove it from ${f.count} person${f.count !== 1 ? 's' : ''}.`
    if (!confirm(msg)) return
    await FacetRepo.delete(f.id)
    setFacets((prev) => prev.filter((x) => x.id !== f.id))
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
                {fs.map((f) =>
                  editingId === f.id ? (
                    <div key={f.id} className="facets-item facets-item--editing">
                      <div className="facets-item-edit">
                        <input
                          className="facets-item-input"
                          value={editingLabel}
                          onChange={(e) => { setEditingLabel(e.target.value); setEditError('') }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(f)
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                          autoFocus
                        />
                        {editError && <span className="facets-item-error">{editError}</span>}
                        <button className="btn btn-primary facets-item-save" onClick={() => handleEditSave(f)}>Save</button>
                        <button className="btn btn-outline" onClick={handleEditCancel}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={f.id} className="facets-item">
                      <button className="facets-item-label" onClick={() => handleFacetClick(f.id)}>
                        {f.label}
                      </button>
                      <div className="facets-item-right">
                        <span className="facets-item-count">{f.count}</span>
                        <div className="facets-item-actions">
                          <button
                            className="facets-item-btn"
                            onClick={() => handleEditStart(f)}
                            title="Edit"
                            aria-label={`Edit ${f.label}`}
                          >✎</button>
                          <button
                            className="facets-item-btn facets-item-btn--danger"
                            onClick={() => handleDelete(f)}
                            title="Delete"
                            aria-label={`Delete ${f.label}`}
                          >✕</button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
