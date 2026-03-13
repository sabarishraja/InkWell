/**
 * App.tsx — Root component with routing and auth guard.
 *
 * Route structure:
 *   /             → LandingPage     (public)
 *   /auth         → AuthPage        (public — redirects to /dashboard if logged in)
 *   /dashboard    → DashboardPage   (protected)
 *   /letter/:id   → LetterViewPage  (protected)
 *   /compose      → ComposePage     (protected)
 *
 * GrainOverlay is rendered once and covers every page.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GrainOverlay }    from './components/layout/GrainOverlay';
import { LandingPage }     from './pages/LandingPage';
import { AuthPage }        from './pages/AuthPage';
import { DashboardPage }   from './pages/DashboardPage';
import { LetterViewPage }  from './pages/LetterViewPage';
import { ComposePage }     from './pages/ComposePage';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import './styles/global.css';

// ---- Auth Guard ------------------------------------------------------

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div
        className="desk-bg"
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        role="status"
        aria-label="Loading"
      />
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// ---- App -------------------------------------------------------------

export function App() {
  return (
    <BrowserRouter>
      {/* Grain texture overlay — covers every page */}
      <GrainOverlay />

      <Routes>
        {/* Public routes */}
        <Route path="/"    element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/letter/:id"
          element={
            <AuthGuard>
              <LetterViewPage />
            </AuthGuard>
          }
        />
        <Route
          path="/compose"
          element={
            <AuthGuard>
              <ComposePage />
            </AuthGuard>
          }
        />

        {/* Legacy route aliases for in-progress links */}
        <Route path="/write" element={<Navigate to="/compose"   replace />} />
        <Route path="/vault" element={<Navigate to="/dashboard" replace />} />

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
