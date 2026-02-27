import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Facet, Person } from '@/db/types'
import { PeopleRepo } from '@/repos/PeopleRepo'
import { FacetRepo } from '@/repos/FacetRepo'
import { LinkRepo } from '@/repos/LinkRepo'
import { FacetChip } from '@/components/FacetChip'
import './PersonDetailScreen.css'

export function PersonDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<Person | null>(null)
  const [facets, setFacets] = useState<Facet[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    const [p, facetIds] = await Promise.all([
      PeopleRepo.getById(id),
      LinkRepo.getFacetIdsForPerson(id),
    ])
    if (!p) { navigate('/'); return }
    const fs = await FacetRepo.getByIds(facetIds)
    fs.sort((a, b) => {
      if (a.type && !b.type) return -1
      if (!a.type && b.type) return 1
      return a.label.localeCompare(b.label)
    })
    setPerson(p)
    setFacets(fs)
    setLoading(false)
    // Update lastViewedAt
    await PeopleRepo.update(id, { lastViewedAt: Date.now() })
  }

  useEffect(() => { load() }, [id])

  const togglePin = async (facetId: string) => {
    if (!person) return
    const pinned = person.pinnedFacetIds ?? []
    const next = pinned.includes(facetId)
      ? pinned.filter((x) => x !== facetId)
      : [...pinned, facetId]
    await PeopleRepo.update(person.id, { pinnedFacetIds: next })
    setPerson((p) => p ? { ...p, pinnedFacetIds: next } : p)
  }

  const handleFacetClick = (facetId: string) => {
    navigate(`/?facet=${facetId}`)
  }

  const handleDelete = async () => {
    if (!person) return
    if (!confirm(`Delete ${person.name}? This cannot be undone.`)) return
    await PeopleRepo.delete(person.id)
    navigate('/')
  }

  if (loading) return <div className="screen"><div className="screen-body home-empty">Loading…</div></div>
  if (!person) return null

  // Group facets by type
  const grouped: Record<string, Facet[]> = {}
  for (const f of facets) {
    const key = f.type ?? ''
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  }

  const pinnedIds = new Set(person.pinnedFacetIds ?? [])

  return (
    <div className="screen">
      <div className="screen-header detail-header">
        <button className="back-btn" onClick={() => navigate('/')} aria-label="Back">← Back</button>
        <div className="detail-header-actions">
          <button className="btn btn-outline detail-edit-btn" onClick={() => navigate(`/person/${person.id}/edit`)}>
            Edit
          </button>
          <button className="btn btn-danger detail-delete-btn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="screen-body detail-body">
        <h1 className="detail-name">{person.name}</h1>
        {person.reminder && <p className="detail-reminder">{person.reminder}</p>}
        {person.notes && <p className="detail-notes">{person.notes}</p>}
        <p className="detail-meta muted">
          Added {new Date(person.createdAt).toLocaleDateString()}
          {person.updatedAt !== person.createdAt && ` · Updated ${new Date(person.updatedAt).toLocaleDateString()}`}
        </p>

        <div className="detail-facets-section">
          <h2 className="detail-section-title">Tags / Facets</h2>
          {facets.length === 0 ? (
            <p className="muted">No facets yet.</p>
          ) : (
            Object.entries(grouped).map(([type, fs]) => (
              <div key={type} className="detail-facet-group">
                {type && <span className="detail-group-label">{type}</span>}
                <div className="detail-facet-chips">
                  {fs.map((f) => (
                    <FacetChip
                      key={f.id}
                      facet={f}
                      variant="detail"
                      pinned={pinnedIds.has(f.id)}
                      onPin={() => togglePin(f.id)}
                      onClick={() => handleFacetClick(f.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
