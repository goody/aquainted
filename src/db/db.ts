import Dexie, { type Table } from 'dexie'
import type { Person, Facet, Link } from './types'

class AquaintanceDB extends Dexie {
  people!: Table<Person, string>
  facets!: Table<Facet, string>
  links!: Table<Link, [string, string]>

  constructor() {
    super('aquaintance')

    this.version(1).stores({
      // Primary key + indexed fields
      people: 'id, name, updatedAt, createdAt',
      facets: 'id, normalizedKey, label, type, createdAt',
      links: '[personId+facetId], personId, facetId',
    })
  }
}

export const db = new AquaintanceDB()
