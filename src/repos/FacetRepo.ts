import { db } from '@/db/db'
import type { Facet } from '@/db/types'
import { normalizeFacet } from '@/services/facetNormalize'
import { generateId } from '@/utils/uuid'

export const FacetRepo = {
  async findOrCreate(label: string, type?: string): Promise<Facet> {
    const normalizedKey = normalizeFacet(label, type)
    const existing = await db.facets.where('normalizedKey').equals(normalizedKey).first()
    if (existing) return existing

    const facet: Facet = {
      id: generateId(),
      label: label.trim(),
      type: type?.trim() || undefined,
      normalizedKey,
      createdAt: Date.now(),
    }
    await db.facets.add(facet)
    return facet
  },

  async getAll(): Promise<Facet[]> {
    return db.facets.orderBy('label').toArray()
  },

  async getByIds(ids: string[]): Promise<Facet[]> {
    return db.facets.where('id').anyOf(ids).toArray()
  },

  async searchByLabel(query: string): Promise<Facet[]> {
    if (!query.trim()) return []
    const lower = query.toLowerCase()
    return db.facets
      .filter((f) => f.label.toLowerCase().includes(lower))
      .limit(20)
      .toArray()
  },

  async getWithCounts(): Promise<Array<Facet & { count: number }>> {
    const [facets, links] = await Promise.all([
      db.facets.toArray(),
      db.links.toArray(),
    ])
    const countMap = new Map<string, number>()
    for (const link of links) {
      countMap.set(link.facetId, (countMap.get(link.facetId) ?? 0) + 1)
    }
    return facets
      .map((f) => ({ ...f, count: countMap.get(f.id) ?? 0 }))
      .sort((a, b) => a.label.localeCompare(b.label))
  },

  async update(id: string, changes: Partial<Facet>): Promise<void> {
    await db.facets.update(id, changes)
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.facets, db.links, async () => {
      await db.links.where('facetId').equals(id).delete()
      await db.facets.delete(id)
    })
  },

  async clear(): Promise<void> {
    await db.facets.clear()
  },

  async bulkPut(facets: Facet[]): Promise<void> {
    await db.facets.bulkPut(facets)
  },

  async getByNormalizedKey(key: string): Promise<Facet | undefined> {
    return db.facets.where('normalizedKey').equals(key).first()
  },
}
