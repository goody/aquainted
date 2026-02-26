import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Facet } from '@/db/types'
import { PeopleRepo } from '@/repos/PeopleRepo'
import { FacetRepo } from '@/repos/FacetRepo'
import { LinkRepo } from '@/repos/LinkRepo'
import { recordFacetUsed } from '@/hooks/useRecentFacets'
import { generateId } from '@/utils/uuid'
import './AddEditPersonScreen.css'

interface FacetEntry {
  facet: Facet
  pinned: boolean
}

export function AddEditPersonScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [facetEntries, setFacetEntries] = useState<FacetEntry[]>([])
  const [facetInput, setFacetInput] = useState('')
  const [facetType, setFacetType] = useState('')
  const [suggestions, setSuggestions] = useState<Facet[]>([])
  const [saving, setSaving] = useState(false)
  const facetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit) return
    async function loadPerson() {
      const [person, facetIds] = await Promise.all([
        PeopleRepo.getById(id!),
        LinkRepo.getFacetIdsForPerson(id!),
      ])
      if (!person) { navigate('/'); return }
      setName(person.name)
      setNotes(person.notes ?? '')
      if (facetIds.length > 0) {
        const facets = await FacetRepo.getByIds(facetIds)
        const pinned = new Set(person.pinnedFacetIds ?? [])
        setFacetEntries(
          facetIds
            .map((fid) => ({ facet: facets.find((f) => f.id === fid)!, pinned: pinned.has(fid) }))
            .filter((e) => e.facet)
        )
      }
    }
    loadPerson()
  }, [id, isEdit, navigate])

  useEffect(() => {
    if (!facetInput.trim()) { setSuggestions([]); return }
    FacetRepo.searchByLabel(facetInput).then((fs) => setSuggestions(fs.slice(0, 6)))
  }, [facetInput])

  const addFacet = async (label: string, type?: string) => {
    const t = type ?? (facetType.trim() || undefined)
    const facet = await FacetRepo.findOrCreate(label, t)
    if (!facetEntries.find((e) => e.facet.id === facet.id)) {
      setFacetEntries((prev) => [...prev, { facet, pinned: false }])
      recordFacetUsed(facet.id)
    }
    setFacetInput('')
    setFacetType('')
    setSuggestions([])
    facetInputRef.current?.focus()
  }

  const removeFacet = (facetId: string) => {
    setFacetEntries((prev) => prev.filter((e) => e.facet.id !== facetId))
  }

  const togglePin = (facetId: string) => {
    setFacetEntries((prev) =>
      prev.map((e) => e.facet.id === facetId ? { ...e, pinned: !e.pinned } : e)
    )
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const now = Date.now()
      let pinnedIds = facetEntries.filter((e) => e.pinned).map((e) => e.facet.id)
      if (pinnedIds.length === 0 && facetEntries.length > 0 && !isEdit) {
        pinnedIds = facetEntries.slice(0, 3).map((e) => e.facet.id)
      }

      if (isEdit) {
        await PeopleRepo.update(id!, {
          name: name.trim(),
          notes: notes.trim() || undefined,
          pinnedFacetIds: pinnedIds,
          updatedAt: now,
        })
        // Reconcile links
        const existing = await LinkRepo.getFacetIdsForPerson(id!)
        const desired = new Set(facetEntries.map((e) => e.facet.id))
        for (const fid of existing) {
          if (!desired.has(fid)) await LinkRepo.removeLink(id!, fid)
        }
        for (const { facet } of facetEntries) {
          await LinkRepo.addLink(id!, facet.id)
        }
        navigate(`/person/${id}`)
      } else {
        const person = {
          id: generateId(),
          name: name.trim(),
          notes: notes.trim() || undefined,
          createdAt: now,
          updatedAt: now,
          pinnedFacetIds: pinnedIds,
        }
        await PeopleRepo.add(person)
        for (const { facet } of facetEntries) {
          await LinkRepo.addLink(person.id, facet.id)
        }
        navigate(`/person/${person.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFacetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && facetInput.trim()) {
      e.preventDefault()
      if (suggestions.length > 0) {
        addFacet(suggestions[0].label, suggestions[0].type)
      } else {
        addFacet(facetInput.trim())
      }
    }
  }

  return (
    <div className="screen">
      <div className="screen-header detail-header">
        <button className="back-btn" onClick={() => navigate(isEdit ? `/person/${id}` : '/')}>
          ← {isEdit ? 'Cancel' : 'Back'}
        </button>
        <h2 className="edit-title">{isEdit ? 'Edit Person' : 'New Person'}</h2>
        <button
          className="btn btn-primary edit-save-btn"
          onClick={save}
          disabled={saving || !name.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="screen-body edit-body">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            className="input"
            type="text"
            placeholder="Full name or nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!isEdit}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="input edit-notes"
            placeholder="Optional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tags / Facets</label>
          <div className="edit-facet-row">
            <input
              ref={facetInputRef}
              className="input"
              type="text"
              placeholder="Tag label…"
              value={facetInput}
              onChange={(e) => setFacetInput(e.target.value)}
              onKeyDown={handleFacetKeyDown}
              autoComplete="off"
            />
            <input
              className="input edit-type-input"
              type="text"
              placeholder="Type (optional)"
              value={facetType}
              onChange={(e) => setFacetType(e.target.value)}
              onKeyDown={handleFacetKeyDown}
            />
            <button
              className="btn btn-outline"
              onClick={() => facetInput.trim() && addFacet(facetInput.trim())}
              disabled={!facetInput.trim()}
            >
              Add
            </button>
          </div>

          {suggestions.length > 0 && facetInput && (
            <ul className="edit-suggestions">
              {suggestions.map((f) => (
                <li key={f.id} className="edit-suggestion" onMouseDown={() => addFacet(f.label, f.type)}>
                  <span>{f.label}</span>
                  {f.type && <span className="result-type">{f.type}</span>}
                </li>
              ))}
            </ul>
          )}

          {facetEntries.length > 0 && (
            <div className="edit-facet-list">
              {facetEntries.map(({ facet, pinned }) => (
                <div key={facet.id} className="edit-facet-item">
                  <span className="edit-facet-label">{facet.label}</span>
                  {facet.type && <span className="edit-facet-type">{facet.type}</span>}
                  <button
                    className={`qa-pin-btn${pinned ? ' qa-pin-btn--active' : ''}`}
                    onClick={() => togglePin(facet.id)}
                    title={pinned ? 'Unpin' : 'Pin to card'}
                  >★</button>
                  <button
                    className="qa-remove-btn"
                    onClick={() => removeFacet(facet.id)}
                    aria-label={`Remove ${facet.label}`}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
