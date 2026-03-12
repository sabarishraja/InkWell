/**
 * App.tsx — Root component with routing and auth guard.
 *
 * Route structure:
 *   /            → LandingPage (public)
 *   /write       → WritePage   (protected — requires auth)
 *   /vault       → VaultPage   (protected — requires auth)
 *   /letter/:id  → RecipientPage (public — anyone with the link)
 *   /auth        → AuthPage    (public — sign in)
 *
 * GrainOverlay is rendered once here and covers every page.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GrainOverlay }  from './components/layout/GrainOverlay';
import { LandingPage }   from './pages/LandingPage';
import { WritePage }     from './pages/WritePage';
import { VaultPage }     from './pages/VaultPage';
import { RecipientPage } from './pages/RecipientPage';
import { AuthPage }      from './pages/AuthPage';
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
      {/* Grain texture overlay — rendered once, covers every page */}
      <GrainOverlay />

      <Routes>
        {/* Public routes */}
        <Route path="/"           element={<LandingPage />} />
        <Route path="/auth"       element={<AuthPage />} />
        <Route path="/letter/:id" element={<RecipientPage />} />

        {/* Protected routes — require Supabase session */}
        <Route
          path="/write"
          element={
            <AuthGuard>
              <WritePage />
            </AuthGuard>
          }
        />
        <Route
          path="/vault"
          element={
            <AuthGuard>
              <VaultPage />
            </AuthGuard>
          }
        />

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
