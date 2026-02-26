import { db } from '@/db/db'
import { PeopleRepo } from '@/repos/PeopleRepo'
import { FacetRepo } from '@/repos/FacetRepo'
import { LinkRepo } from '@/repos/LinkRepo'
import { normalizeFacet } from '@/services/facetNormalize'
import type { ExportData, Facet, Link, Person } from '@/db/types'

const SCHEMA_VERSION = 1

export async function exportToJSON(): Promise<void> {
  const [people, facets, links] = await Promise.all([
    db.people.toArray(),
    db.facets.toArray(),
    db.links.toArray(),
  ])

  const data: ExportData = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    people,
    facets,
    links,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `acquainted-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFromJSON(file: File): Promise<{ imported: number; updated: number; skipped: number }> {
  const text = await file.text()
  const data: ExportData = JSON.parse(text)

  if (!data.schemaVersion || !Array.isArray(data.people) || !Array.isArray(data.facets) || !Array.isArray(data.links)) {
    throw new Error('Invalid export file format')
  }

  let imported = 0
  let updated = 0
  let skipped = 0

  // Build a map from imported facet ID → local facet ID (for remapping links)
  const facetIdMap = new Map<string, string>()

  // Import facets: dedupe by normalizedKey
  for (const importedFacet of data.facets as Facet[]) {
    const key = importedFacet.normalizedKey || normalizeFacet(importedFacet.label, importedFacet.type)
    const existing = await FacetRepo.getByNormalizedKey(key)
    if (existing) {
      facetIdMap.set(importedFacet.id, existing.id)
      skipped++
    } else {
      await db.facets.put({ ...importedFacet, normalizedKey: key })
      facetIdMap.set(importedFacet.id, importedFacet.id)
      imported++
    }
  }

  // Import people: if ID exists, prefer newer updatedAt
  for (const importedPerson of data.people as Person[]) {
    const existing = await PeopleRepo.getById(importedPerson.id)
    if (existing) {
      if (importedPerson.updatedAt > existing.updatedAt) {
        await db.people.put(importedPerson)
        updated++
      } else {
        skipped++
      }
    } else {
      await db.people.put(importedPerson)
      imported++
    }
  }

  // Import links: remap facetIds, dedupe
  const importedLinks: Link[] = (data.links as Link[]).map((l) => ({
    personId: l.personId,
    facetId: facetIdMap.get(l.facetId) ?? l.facetId,
  }))

  // Dedupe
  const uniqueLinks = Array.from(
    new Map(importedLinks.map((l) => [`${l.personId}:${l.facetId}`, l])).values()
  )

  await LinkRepo.bulkPut(uniqueLinks)

  return { imported, updated, skipped }
}
