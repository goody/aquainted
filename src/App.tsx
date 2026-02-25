import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { HomeScreen } from '@/screens/HomeScreen'
import { PersonDetailScreen } from '@/screens/PersonDetailScreen'
import { AddEditPersonScreen } from '@/screens/AddEditPersonScreen'
import { FacetsBrowserScreen } from '@/screens/FacetsBrowserScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { useTheme } from '@/hooks/useTheme'
import './App.css'

function BottomNav() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isFacets = location.pathname === '/facets'
  const isSettings = location.pathname === '/settings'

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <NavLink to="/" className={`nav-item${isHome ? ' nav-item--active' : ''}`} end>
        <span className="nav-icon">👥</span>
        <span className="nav-label">People</span>
      </NavLink>
      <NavLink to="/facets" className={`nav-item${isFacets ? ' nav-item--active' : ''}`}>
        <span className="nav-icon">🏷</span>
        <span className="nav-label">Tags</span>
      </NavLink>
      <NavLink to="/settings" className={`nav-item${isSettings ? ' nav-item--active' : ''}`}>
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
      </NavLink>
    </nav>
  )
}

// Handle ?facet= query param from FacetsBrowser navigation
function HomeScreenWithFacet() {
  const [searchParams, setSearchParams] = useSearchParams()
  const facetId = searchParams.get('facet')

  useEffect(() => {
    if (facetId) {
      // Clear the query param after reading it — HomeScreen manages its own state
      setSearchParams({}, { replace: true })
      // Store in sessionStorage for HomeScreen to pick up
      sessionStorage.setItem('pendingFacetFilter', facetId)
    }
  }, [facetId, setSearchParams])

  return <HomeScreenAdapter />
}

function HomeScreenAdapter() {
  return <HomeScreen />
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeScreenWithFacet />} />
        <Route path="/person/new" element={<AddEditPersonScreen />} />
        <Route path="/person/:id" element={<PersonDetailScreen />} />
        <Route path="/person/:id/edit" element={<AddEditPersonScreen />} />
        <Route path="/facets" element={<FacetsBrowserScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </>
  )
}

export function App() {
  useTheme() // Apply theme on mount
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
