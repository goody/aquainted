export interface Person {
  id: string
  name: string
  reminder?: string
  notes?: string
  createdAt: number
  updatedAt: number
  pinnedFacetIds?: string[]
  lastViewedAt?: number
}

export interface Facet {
  id: string
  label: string
  type?: string
  normalizedKey: string
  createdAt: number
}

export interface Link {
  personId: string
  facetId: string
}

export interface ExportData {
  schemaVersion: number
  exportedAt: number
  people: Person[]
  facets: Facet[]
  links: Link[]
}
