import { useRef, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { exportToJSON, importFromJSON } from '@/services/exportImport'
import { db } from '@/db/db'
import './SettingsScreen.css'

export function SettingsScreen() {
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleExport = async () => {
    try {
      await exportToJSON()
    } catch {
      alert('Export failed. Please try again.')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    try {
      const result = await importFromJSON(file)
      setImportStatus(`Done! Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`)
    } catch (err) {
      setImportStatus(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Clear ALL data? This cannot be undone.')) return
    if (!confirm('Are you sure? All people, facets, and links will be deleted.')) return
    setClearing(true)
    try {
      await db.transaction('rw', db.people, db.facets, db.links, async () => {
        await Promise.all([db.people.clear(), db.facets.clear(), db.links.clear()])
      })
      alert('All data cleared.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="screen-body settings-body">
        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-item">
            <span className="settings-label">Theme</span>
            <div className="theme-toggle">
              <button
                className={`theme-btn${theme === 'light' ? ' theme-btn--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                ☀️ Light
              </button>
              <button
                className={`theme-btn${theme === 'dark' ? ' theme-btn--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Data</h2>

          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Export</span>
              <span className="settings-desc muted">Download all your data as JSON</span>
            </div>
            <button className="btn btn-outline settings-btn" onClick={handleExport}>
              Export
            </button>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Import</span>
              <span className="settings-desc muted">Merge data from a JSON export file</span>
            </div>
            <button
              className="btn btn-outline settings-btn"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="sr-only"
              aria-label="Import data file"
            />
          </div>

          {importStatus && (
            <div className={`import-status${importStatus.startsWith('Import failed') ? ' import-status--error' : ''}`}>
              {importStatus}
            </div>
          )}
        </section>

        <section className="settings-section settings-section--danger">
          <h2 className="settings-section-title settings-section-title--danger">Danger Zone</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Clear all data</span>
              <span className="settings-desc muted">Permanently delete everything</span>
            </div>
            <button
              className="btn btn-danger settings-btn"
              onClick={handleClearAll}
              disabled={clearing}
            >
              {clearing ? 'Clearing…' : 'Clear all'}
            </button>
          </div>
        </section>

        <div className="settings-footer muted">
          <p>Acquainted v0.1.0</p>
          <p>All data stored locally in your browser.</p>
        </div>
      </div>
    </div>
  )
}
