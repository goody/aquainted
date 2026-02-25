You are a senior full-stack engineer building a production-quality PWA.

Goal
Build a Personal “People I Met” app that lets me:
1) Create a person entry quickly
2) Attach reusable “facets” (mostly tags) to that person
3) Retrieve people fast by searching OR by clicking facets (facets act like connectors)
Example: I meet someone at the dog park. I log their name + facets like “Dog Park”, “Dog”, “Jericho (dog name)”. Later I forget their name; I tap “Dog Park” and/or “Dog” and find them.

Platform / constraints
- Must run as an installable PWA on mobile + desktop.
- Offline-first: app fully usable with no network.
- Local-first storage in browser.
- Must support Export/Import now, with the architecture prepared for optional cloud sync later.

Tech choices (use unless impossible)
- React + TypeScript + Vite
- Storage: IndexedDB using Dexie (preferred) or idb
- PWA: vite-plugin-pwa (Workbox) for app shell caching
- UI: minimal, fast, mobile-first

Core data model
People
- id: uuid
- name: string (single display name)
- notes?: string
- createdAt, updatedAt: number (epoch ms)
- pinnedFacetIds?: string[]  (a small list of facets shown under their name, like “starred/most used”)
- lastViewedAt?: number (optional)

Facets (mostly tags)
- id: uuid
- label: string (human visible, e.g. “Dog Park”, “Dog”, “Jericho”)
- type?: string (optional grouping, e.g. “location”, “pet”, “dogName”, “hobby”; allow arbitrary types but don’t force them)
- normalizedKey: string used for dedupe + search (see below)
- createdAt: number

Links (many-to-many)
- personId: string
- facetId: string

Facet uniqueness / dedupe rules (important)
Facets are “mostly tags” but should try to be unique.
- Normalize: lowercase, trim, collapse whitespace, remove punctuation (reasonable), and include type in the key if present.
  Example key:
  - if type exists: `${type}:${normalizedLabel}`
  - else: `tag:${normalizedLabel}`
- When the user adds a facet, if an existing facet matches normalizedKey, reuse it.
- Allow users to rename a facet label (and propagate to all people) if feasible (nice-to-have).
- Provide a way to merge duplicates (nice-to-have).

Filtering requirements
- Clicking a facet adds it to active filters.
- Support both AND and OR filtering:
  - Default: AND (person must have ALL selected facets)
  - Toggle: OR (person must have ANY selected facets)
- Show active filter chips and allow removing individual chips and “clear all”.

Search requirements
- Single search input that can match:
  - People by name
  - Facets by label (typeahead)
- If the user selects a facet from search results, apply it as a filter.
- Searching should feel instant for a few thousand people/facets; use IndexedDB indexes where appropriate.

Primary screens / UX
1) People list (Home)
- Search bar at top
- Active filter chips row under search
- AND/OR toggle near filter chips
- List of people cards:
  - Name
  - Under name: pinnedFacet chips (starred facets)
  - Optional: a few more facet chips + “+N” indicator
  - Tapping a facet chip applies filter (same behavior everywhere)
- Sort default: recently updated; allow option to sort by name.

2) Person detail
- Name, notes
- Facets grouped by type (if types exist) otherwise a simple list
- Tap any facet to filter
- Edit button
- “Pin/unpin” facet controls so I can choose which facets appear under the person’s name in lists

3) Add/Edit person
- Name input (required)
- Notes (optional)
- Facet editor:
  - Add facet via typeahead: select existing facet or create new
  - Remove facet
  - Optional: quick “Add common facet types” chips (Location, Dog, Work, etc) but keep types optional

4) Facets browser
- List facets (grouped by type if present) with counts (# people linked)
- Tap facet to filter people list
UI details (important)
Facet chips
- Facet chips are “square pill” buttons:
  - Rounded corners but not fully circular (e.g., 10–14px radius)
  - Consistent height (e.g., 28–32px)
  - Tight padding, readable text
  - Hover/pressed states on desktop; clear tap feedback on mobile
- Chips are clickable everywhere and apply the facet filter.
- Chips can appear in these contexts:
  - As filters (active filter chips row) with an “x” to remove
  - On person cards (pinned facets beneath name)
  - On person detail (full facet list)
- Maintain a consistent visual language across contexts (same chip component with variants).

Theming (must-have)
- Implement Light/Dark theme toggle in the UI (header or settings).
- Persist theme choice locally (IndexedDB or localStorage is fine; localStorage preferred for simplicity).
- Use CSS variables design tokens to enable future custom skins/themes without rewriting components:
  - Define tokens like: --bg, --fg, --muted, --card, --border, --chipBg, --chipFg, --accent, --danger, etc.
- Structure styling so future themes can be added by swapping a token set (e.g., data-theme="dark" / "light" / later "tiki", "midcentury", etc).
- Avoid hardcoding colors inside components; reference tokens.

Quick Add flow (must-have)
Goal: add a person in under ~10 seconds with one hand.

Quick Add entry points
- Prominent “+ Quick Add” button on People list screen (floating action button on mobile; toolbar button on desktop).
- Optional keyboard shortcut on desktop (e.g., “N” or Cmd/Ctrl+K then “new person”) if easy.

Quick Add UI behavior
- Opens a lightweight modal/bottom sheet (mobile) or modal (desktop).
- Minimal fields shown initially:
  1) Name (required, auto-focus)
  2) Facet input (typeahead) with “Add” action
- As the user types in facet input:
  - show matching existing facets (by label; fast)
  - allow pressing Enter to create a new facet if no match
- Show recently used facets as quick-tap suggestions (e.g., last 10 facets used globally, or most used).
- Allow pinning facets during quick add:
  - Provide a simple “Pin” star icon on facets added in quick-add, OR a “Pin these” toggle that pins all added facets by default.
- “Save” should create the person and return to People list, where the new person appears at top.
- After saving, keep quick-add open with cleared fields as an optional toggle (“Add another”) for rapid entry.

Form design rules
- Avoid multi-step screens for quick-add.
- Keep additional fields (notes, advanced facets/types) behind “More” expandable section.
- Provide sensible defaults:
  - If user adds facets during quick-add and doesn’t pin any, auto-pin the first 2–3 facets for that person so they show under the name in lists.

Settings screen (small)
- Add a basic Settings screen or menu that includes:
  - Theme toggle (light/dark)
  - Export data
  - Import data
  - (optional) Clear all data (with confirmation)

Offline & PWA requirements
- PWA manifest configured: name, icons, theme color, display mode
- Service worker caches app shell so it loads offline reliably
- Data is in IndexedDB and persists across sessions

Export / Import (must-have for v1)
Export
- “Export data” downloads a JSON file containing:
  - schemaVersion
  - people[]
  - facets[]
  - links[]
  - exportedAt
Import
- “Import data” uploads JSON and merges into local DB
- Merge behavior:
  - People: if IDs collide, prefer imported record if updatedAt is newer (or keep both with new ID — pick one and document it)
  - Facets: dedupe using normalizedKey; merge facet IDs in links accordingly
  - Links: dedupe identical (personId, facetId)

Architecture for future sync (do not implement sync yet, but design for it)
- Abstract data access behind a repository/service layer:
  - PeopleRepo, FacetRepo, LinkRepo
- Keep export/import logic separate and reusable.
- Avoid assumptions that all data is single-device forever (e.g., leave room for conflict resolution).

Performance requirements
- IndexedDB indexes for:
  - people.name (for prefix search)
  - facets.normalizedKey / facets.label
  - links by personId and by facetId
- Filtering should not require loading entire DB into memory for large datasets; use indexed queries where possible.

Quality requirements
- Provide clear setup steps: install, dev server, build, and “how to install as PWA”
- Provide folder/file structure
- Include a short “Assumptions” section at top
- Include a basic test plan (manual steps are fine)
- Use clean, readable code and TypeScript types throughout

Deliverables
- A working Vite+React+TS project with the above screens
- IndexedDB (Dexie) schema and migration strategy
- PWA manifest + service worker config
- Export/Import UI and implementation
- Seed/demo data optional but helpful

Nice-to-haves (only if time)
- Facet rename + merge duplicates UI
- Quick-add button for “met at” date/time or “last seen”
- Person-to-person relationship edges (v2 idea, not required)