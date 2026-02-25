import { db } from '@/db/db'
import type { Link } from '@/db/types'

export const LinkRepo = {
  async addLink(personId: string, facetId: string): Promise<void> {
    // Dexie will throw on duplicate compound key — use put to upsert
    await db.links.put({ personId, facetId })
  },

  async removeLink(personId: string, facetId: string): Promise<void> {
    await db.links.where('[personId+facetId]').equals([personId, facetId]).delete()
  },

  async getByPersonId(personId: string): Promise<Link[]> {
    return db.links.where('personId').equals(personId).toArray()
  },

  async getByFacetId(facetId: string): Promise<Link[]> {
    return db.links.where('facetId').equals(facetId).toArray()
  },

  async getFacetIdsForPerson(personId: string): Promise<string[]> {
    const links = await db.links.where('personId').equals(personId).toArray()
    return links.map((l) => l.facetId)
  },

  async getPersonIdsForFacet(facetId: string): Promise<string[]> {
    const links = await db.links.where('facetId').equals(facetId).toArray()
    return links.map((l) => l.personId)
  },

  async getAll(): Promise<Link[]> {
    return db.links.toArray()
  },

  async clear(): Promise<void> {
    await db.links.clear()
  },

  async bulkPut(links: Link[]): Promise<void> {
    await db.links.bulkPut(links)
  },

  async removeLinksByPersonId(personId: string): Promise<void> {
    await db.links.where('personId').equals(personId).delete()
  },
}
