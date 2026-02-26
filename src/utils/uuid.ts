/**
 * Generates a UUID v4. Uses crypto.randomUUID() when available (secure
 * contexts / HTTPS), falls back to crypto.getRandomValues() which works
 * in non-secure contexts (e.g. local network HTTP).
 */
export function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // UUID v4 via getRandomValues — works on HTTP
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = Number(c)
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16)
  })
}
