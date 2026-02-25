/**
 * Normalize a facet label (and optional type) into a dedupe key.
 * Rules: lowercase, trim, collapse whitespace, strip punctuation.
 * Key format: `${type}:${normalizedLabel}` or `tag:${normalizedLabel}`
 */
export function normalizeFacet(label: string, type?: string): string {
  const normalizedLabel = label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '') // remove punctuation except hyphens
    .trim()

  const prefix = type ? type.toLowerCase().trim() : 'tag'
  return `${prefix}:${normalizedLabel}`
}
