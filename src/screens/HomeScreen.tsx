import { useState, useCallback, useEffect } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { FilterBar } from '@/components/FilterBar'
import { PersonCard } from '@/components/PersonCard'
import { QuickAddModal } from '@/components/QuickAddModal'
import { useFilteredPeople, type SortMode } from '@/hooks/useFilteredPeople'
import './HomeScreen.css'

export function HomeScreen() {
  const [search, setSearch] = useState('')
  const [activeFacetIds, setActiveFacetIds] = useState<string[]>([])
  const [andMode, setAndMode] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('updatedAt')
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const { people, loading, refresh } = useFilteredPeople(search, activeFacetIds, andMode, sortMode)

  const addFacetFilter = useCallback((facetId: string) => {
    setActiveFacetIds((prev) => prev.includes(facetId) ? prev : [...prev, facetId])
  }, [])

  const removeFacetFilter = useCallback((facetId: string) => {
    setActiveFacetIds((prev) => prev.filter((id) => id !== facetId))
  }, [])

  // Pick up facet filter set by FacetsBrowser navigation
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingFacetFilter')
    if (pending) {
      sessionStorage.removeItem('pendingFacetFilter')
      addFacetFilter(pending)
    }
  }, [addFacetFilter])

  return (
    <div className="screen home-screen">
      <div className="screen-header">
        <div className="home-header-row">
          <h1 className="home-title">Aquaintance</h1>
          <div className="home-header-actions">
            <button
              className="sort-btn"
              onClick={() => setSortMode((m) => m === 'updatedAt' ? 'name' : 'updatedAt')}
              title={`Sort by ${sortMode === 'updatedAt' ? 'name' : 'recent'}`}
            >
              {sortMode === 'updatedAt' ? '🕐' : '🔤'}
            </button>
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} onAddFacetFilter={addFacetFilter} />
      </div>

      <FilterBar
        activeFacetIds={activeFacetIds}
        andMode={andMode}
        onRemoveFacet={removeFacetFilter}
        onClearAll={() => setActiveFacetIds([])}
        onToggleMode={() => setAndMode((m) => !m)}
      />

      <div className="screen-body home-list">
        {loading ? (
          <div className="home-empty">Loading…</div>
        ) : people.length === 0 ? (
          <div className="home-empty">
            {search || activeFacetIds.length > 0
              ? 'No people match your search or filters.'
              : 'No people yet. Tap + to add someone!'}
          </div>
        ) : (
          <div className="person-list">
            {people.map((p) => (
              <PersonCard key={p.id} person={p} onFacetClick={addFacetFilter} />
            ))}
          </div>
        )}
      </div>

      <button
        className="fab"
        onClick={() => setShowQuickAdd(true)}
        aria-label="Quick add person"
        title="Quick Add (N)"
      >
        +
      </button>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
