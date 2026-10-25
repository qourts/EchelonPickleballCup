import { HashRouter, Route, Routes } from 'react-router-dom'
import { Gated } from './components/GatedRoute.tsx'
import { Layout } from './components/Layout.tsx'
import type { PortalDataSource } from './data/source.ts'
import { PortalProvider } from './hooks/PortalProvider.tsx'
import { Brackets } from './pages/Brackets.tsx'
import { Guide } from './pages/Guide.tsx'
import { Home } from './pages/Home.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { Playoffs } from './pages/Playoffs.tsx'
import { Schedule } from './pages/Schedule.tsx'
import { Standings } from './pages/Standings.tsx'

/**
 * Hash routing keeps every page reachable by direct link and refresh on GitHub Pages, which
 * cannot rewrite unknown paths to index.html under the /EchelonPickleballCup/ sub-path.
 */
export function App({ source }: { source: PortalDataSource }) {
  return (
    <PortalProvider source={source}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="guide" element={<Guide />} />
            <Route path="schedule" element={<Schedule />} />
            <Route
              path="brackets"
              element={
                <Gated section="brackets">
                  <Brackets />
                </Gated>
              }
            />
            <Route
              path="standings"
              element={
                <Gated section="standings">
                  <Standings />
                </Gated>
              }
            />
            <Route
              path="playoffs"
              element={
                <Gated section="playoffs">
                  <Playoffs />
                </Gated>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </PortalProvider>
  )
}
