const KEY = 'recentFacetIds'
const MAX = 10

function readIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getRecentFacetIds(): string[] {
  return readIds()
}

export function recordFacetUsed(facetId: string): void {
  const ids = readIds().filter((id) => id !== facetId)
  ids.unshift(facetId)
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)))
}
