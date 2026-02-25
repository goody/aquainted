import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PeopleRepo } from '@/repos/PeopleRepo'
import { FacetRepo } from '@/repos/FacetRepo'
import type { Person, Facet } from '@/db/types'
import './SearchBar.css'

interface Props {
  value: string
  onChange: (v: string) => void
  onAddFacetFilter: (facetId: string) => void
}

type Result =
  | { kind: 'person'; person: Person }
  | { kind: 'facet'; facet: Facet }

export function SearchBar({ value, onChange, onAddFacetFilter }: Props) {
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    const [people, facets] = await Promise.all([
      PeopleRepo.searchByName(q),
      FacetRepo.searchByLabel(q),
    ])
    const r: Result[] = [
      ...facets.slice(0, 5).map((f): Result => ({ kind: 'facet', facet: f })),
      ...people.slice(0, 5).map((p): Result => ({ kind: 'person', person: p })),
    ]
    setResults(r)
    setOpen(r.length > 0)
    setIdx(-1)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value, search])

  const handleSelect = (r: Result) => {
    if (r.kind === 'facet') {
      onAddFacetFilter(r.facet.id)
      onChange('')
    } else {
      navigate(`/person/${r.person.id}`)
      onChange('')
    }
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); handleSelect(results[idx]) }
    if (e.key === 'Escape') { setOpen(false); setIdx(-1) }
  }

  return (
    <div className="search-bar-wrapper">
      <div className="search-input-row">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          placeholder="Search people or facets…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value && setOpen(results.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-label="Search"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {value && (
          <button className="search-clear" onClick={() => { onChange(''); setOpen(false) }} aria-label="Clear search">×</button>
        )}
      </div>
      {open && (
        <ul className="search-dropdown" role="listbox">
          {results.map((r, i) => (
            <li
              key={r.kind === 'facet' ? r.facet.id : r.person.id}
              className={`search-result${i === idx ? ' search-result--focused' : ''}`}
              role="option"
              aria-selected={i === idx}
              onMouseDown={() => handleSelect(r)}
            >
              {r.kind === 'facet' ? (
                <>
                  <span className="result-icon">🏷</span>
                  <span className="result-label">{r.facet.label}</span>
                  {r.facet.type && <span className="result-type">{r.facet.type}</span>}
                </>
              ) : (
                <>
                  <span className="result-icon">👤</span>
                  <span className="result-label">{r.person.name}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
