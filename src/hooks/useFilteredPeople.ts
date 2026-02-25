import { useState, useEffect, useCallback } from 'react'
import { db } from '@/db/db'
import type { Person } from '@/db/types'

export type SortMode = 'updatedAt' | 'name'

export function useFilteredPeople(
  searchText: string,
  activeFacetIds: string[],
  andMode: boolean,
  sortMode: SortMode = 'updatedAt'
) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      let results: Person[]

      if (activeFacetIds.length > 0) {
        // Facet filtering
        if (andMode) {
          // AND: person must have ALL selected facets
          // Get personIds for each facetId, intersect
          const sets = await Promise.all(
            activeFacetIds.map(async (fid) => {
              const links = await db.links.where('facetId').equals(fid).toArray()
              return new Set(links.map((l) => l.personId))
            })
          )
          const intersection = sets.reduce((acc, s) => {
            acc.forEach((id) => { if (!s.has(id)) acc.delete(id) })
            return acc
          }, new Set(sets[0]))
          const ids = Array.from(intersection)
          results = await db.people.where('id').anyOf(ids).toArray()
        } else {
          // OR: person must have ANY selected facet
          const links = await db.links.where('facetId').anyOf(activeFacetIds).toArray()
          const ids = Array.from(new Set(links.map((l) => l.personId)))
          results = await db.people.where('id').anyOf(ids).toArray()
        }
      } else {
        results = await db.people.toArray()
      }

      // Apply text search on top
      if (searchText.trim()) {
        const lower = searchText.toLowerCase()
        results = results.filter((p) => p.name.toLowerCase().includes(lower))
      }

      // Sort
      if (sortMode === 'name') {
        results.sort((a, b) => a.name.localeCompare(b.name))
      } else {
        results.sort((a, b) => b.updatedAt - a.updatedAt)
      }

      setPeople(results)
    } finally {
      setLoading(false)
    }
  }, [searchText, activeFacetIds, andMode, sortMode])

  useEffect(() => {
    run()
  }, [run])

  return { people, loading, refresh: run }
}
