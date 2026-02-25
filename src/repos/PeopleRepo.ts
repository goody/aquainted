import { db } from '@/db/db'
import type { Person } from '@/db/types'

export const PeopleRepo = {
  async add(person: Person): Promise<void> {
    await db.people.add(person)
  },

  async update(id: string, changes: Partial<Person>): Promise<void> {
    await db.people.update(id, { ...changes, updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.people, db.links, async () => {
      await db.links.where('personId').equals(id).delete()
      await db.people.delete(id)
    })
  },

  async getById(id: string): Promise<Person | undefined> {
    return db.people.get(id)
  },

  async getAll(): Promise<Person[]> {
    return db.people.orderBy('updatedAt').reverse().toArray()
  },

  async searchByName(query: string): Promise<Person[]> {
    if (!query.trim()) return []
    const lower = query.toLowerCase()
    // Prefix search using name index
    return db.people
      .filter((p) => p.name.toLowerCase().includes(lower))
      .limit(20)
      .toArray()
  },

  async getByIds(ids: string[]): Promise<Person[]> {
    return db.people.where('id').anyOf(ids).toArray()
  },

  async count(): Promise<number> {
    return db.people.count()
  },

  async clear(): Promise<void> {
    await db.people.clear()
  },

  async bulkPut(people: Person[]): Promise<void> {
    await db.people.bulkPut(people)
  },
}
