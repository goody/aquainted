import { useState, useEffect, useRef } from 'react'
import { PeopleRepo } from '@/repos/PeopleRepo'
import { FacetRepo } from '@/repos/FacetRepo'
import { LinkRepo } from '@/repos/LinkRepo'
import { getRecentFacetIds, recordFacetUsed } from '@/hooks/useRecentFacets'
import { generateId } from '@/utils/uuid'
import type { Facet } from '@/db/types'
import './QuickAddModal.css'

interface Props {
  onClose: () => void
  onSaved: () => void
}

interface FacetEntry {
  facet: Facet
  pinned: boolean
}

export function QuickAddModal({ onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [facetInput, setFacetInput] = useState('')
  const [facetSuggestions, setFacetSuggestions] = useState<Facet[]>([])
  const [addedFacets, setAddedFacets] = useState<FacetEntry[]>([])
  const [recentFacets, setRecentFacets] = useState<Facet[]>([])
  const [addAnother, setAddAnother] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [notes, setNotes] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const facetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const ids = getRecentFacetIds()
    if (ids.length > 0) {
      FacetRepo.getByIds(ids).then((facets) => {
        const ordered = ids.map((id) => facets.find((f) => f.id === id)!).filter(Boolean)
        setRecentFacets(ordered)
      })
    }
  }, [])

  useEffect(() => {
    if (!facetInput.trim()) { setFacetSuggestions([]); return }
    FacetRepo.searchByLabel(facetInput).then((f) => setFacetSuggestions(f.slice(0, 6)))
  }, [facetInput])

  const addFacet = async (label: string, type?: string) => {
    const facet = await FacetRepo.findOrCreate(label, type)
    if (!addedFacets.find((e) => e.facet.id === facet.id)) {
      setAddedFacets((prev) => [...prev, { facet, pinned: false }])
    }
    setFacetInput('')
    setFacetSuggestions([])
    recordFacetUsed(facet.id)
    // Don't aggressively re-focus on mobile — let the user tap the input again
    if (window.innerWidth >= 480) {
      facetInputRef.current?.focus()
    }
  }

  const togglePin = (facetId: string) => {
    setAddedFacets((prev) =>
      prev.map((e) => e.facet.id === facetId ? { ...e, pinned: !e.pinned } : e)
    )
  }

  const removeFacetEntry = (facetId: string) => {
    setAddedFacets((prev) => prev.filter((e) => e.facet.id !== facetId))
  }

  const save = async () => {
    if (!name.trim()) { nameRef.current?.focus(); return }
    setSaving(true)
    setError(null)
    try {
      const now = Date.now()

      let pinnedIds = addedFacets.filter((e) => e.pinned).map((e) => e.facet.id)
      if (pinnedIds.length === 0 && addedFacets.length > 0) {
        pinnedIds = addedFacets.slice(0, 3).map((e) => e.facet.id)
      }

      const person = {
        id: generateId(),
        name: name.trim(),
        notes: notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        pinnedFacetIds: pinnedIds,
      }

      await PeopleRepo.add(person)
      for (const { facet } of addedFacets) {
        await LinkRepo.addLink(person.id, facet.id)
      }

      onSaved()

      if (addAnother) {
        setName('')
        setNotes('')
        setAddedFacets([])
        setFacetInput('')
        nameRef.current?.focus()
      } else {
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleFacetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && facetInput.trim()) {
      e.preventDefault()
      if (facetSuggestions.length > 0) {
        addFacet(facetSuggestions[0].label, facetSuggestions[0].type)
      } else {
        addFacet(facetInput.trim())
      }
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Quick add person">
      <div className="modal quick-add-modal">
        <div className="modal-header">
          <h2 className="modal-title">Quick Add</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="qa-fields">
          <input
            ref={nameRef}
            className="input"
            type="text"
            placeholder="Name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && facetInputRef.current?.focus()}
          />

          {/* Added facets shown ABOVE the input so they stay visible on mobile */}
          {addedFacets.length > 0 && (
            <div className="qa-added-facets">
              {addedFacets.map(({ facet, pinned }) => (
                <div key={facet.id} className="qa-facet-entry">
                  <span className="qa-facet-label">{facet.label}</span>
                  <button
                    className={`qa-pin-btn${pinned ? ' qa-pin-btn--active' : ''}`}
                    onClick={() => togglePin(facet.id)}
                    title={pinned ? 'Unpin' : 'Pin to card'}
                    aria-label={pinned ? 'Unpin facet' : 'Pin facet'}
                  >★</button>
                  <button
                    className="qa-remove-btn"
                    onClick={() => removeFacetEntry(facet.id)}
                    aria-label={`Remove ${facet.label}`}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div className="qa-facet-section">
            <div className="qa-facet-input-row">
              <input
                ref={facetInputRef}
                className="input"
                type="text"
                placeholder="Add a tag/facet…"
                value={facetInput}
                onChange={(e) => setFacetInput(e.target.value)}
                onKeyDown={handleFacetKeyDown}
                autoComplete="off"
              />
              {facetInput.trim() && (
                <button
                  className="btn btn-outline qa-add-btn"
                  onClick={() => addFacet(facetInput.trim())}
                  type="button"
                >
                  Add
                </button>
              )}
            </div>

            {facetSuggestions.length > 0 && facetInput && (
              <ul className="qa-suggestions">
                {facetSuggestions.map((f) => (
                  <li key={f.id} className="qa-suggestion" onMouseDown={() => addFacet(f.label, f.type)}>
                    <span className="qa-suggestion-label">{f.label}</span>
                    {f.type && <span className="qa-suggestion-type">{f.type}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {recentFacets.length > 0 && addedFacets.length < 8 && (
            <div className="qa-recents">
              <span className="qa-recents-label">Recent:</span>
              {recentFacets
                .filter((f) => !addedFacets.find((e) => e.facet.id === f.id))
                .slice(0, 6)
                .map((f) => (
                  <button
                    key={f.id}
                    className="qa-recent-chip"
                    onClick={() => addFacet(f.label, f.type)}
                  >
                    {f.label}
                  </button>
                ))}
            </div>
          )}

          {showMore && (
            <textarea
              className="input qa-notes"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          )}

          <button className="qa-more-toggle" onClick={() => setShowMore((s) => !s)}>
            {showMore ? '▲ Less' : '▼ More (notes)'}
          </button>
        </div>

        {error && <div className="qa-error">{error}</div>}

        <div className="qa-footer">
          <label className="qa-add-another">
            <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} />
            Add another
          </label>
          <div className="qa-footer-btns">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
