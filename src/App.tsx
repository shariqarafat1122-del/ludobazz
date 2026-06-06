import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';

// ─────────────────────────────────────────────
// 🎮 Game Pages (Lazy)
// ─────────────────────────────────────────────
const DragonTigerPage    = lazy(() => import('./pages/games/DragonTiger'));
const AndarBaharPage     = lazy(() => import('./pages/games/AndarBahar'));
const PokerGamePage      = lazy(() => import('./pages/games/PokerGame'));
const PokerLobbyPage     = lazy(() => import('./pages/games/PokerLobby'));
const ColorPrediction    = lazy(() => import('./pages/games/ColorPrediction').then(m => ({ default: m.ColorPrediction })));
const LudoLobby          = lazy(() => import('./pages/games/LudoLobby'));
const LudoGame           = lazy(() => import('./pages/games/LudoGame'));
const DiceGame           = lazy(() => import('./pages/games/DiceGame').then(m => ({ default: m.DiceGame })));

// ─────────────────────────────────────────────
// 📄 Main Pages (Lazy)
// ─────────────────────────────────────────────
const Login              = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup             = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const Dashboard          = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Wallet             = lazy(() => import('./pages/Wallet').then(m => ({ default: m.Wallet })));
const AddMoney           = lazy(() => import('./pages/AddMoney').then(m => ({ default: m.AddMoney })));
const Withdrawal         = lazy(() => import('./pages/Withdrawal').then(m => ({ default: m.Withdrawal })));
const WithdrawalHistory  = lazy(() => import('./pages/WithdrawalHistory').then(m => ({ default: m.WithdrawalHistory })));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory').then(m => ({ default: m.TransactionHistory })));
const Referral           = lazy(() => import('./pages/Referral').then(m => ({ default: m.Referral })));
const Profile            = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Notifications      = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Matchmaking        = lazy(() => import('./pages/Matchmaking').then(m => ({ default: m.Matchmaking })));
const GameRoom           = lazy(() => import('./pages/GameRoom').then(m => ({ default: m.GameRoom })));

// ─────────────────────────────────────────────
// ⏳ Global Loading Fallback
// ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0d0620',
        gap: '16px',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTop: '4px solid #a855f7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
        Loading...
      </p>

      {/* Inline keyframe for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// ⚙️ QueryClient
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

// ─────────────────────────────────────────────
// 🚀 App
// ─────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>

          {/* ✅ Suspense wraps ALL routes */}
          <Suspense fallback={<PageLoader />}>
            <Routes>

              {/* ── Public ── */}
              <Route element={<PublicRoute />}>
                <Route path="/login"  element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>

              {/* ── Protected + MainLayout (Header + Sidebar) ── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard"          element={<Dashboard />} />
                  <Route path="/wallet"             element={<Wallet />} />
                  <Route path="/add-money"          element={<AddMoney />} />
                  <Route path="/withdrawal"         element={<Withdrawal />} />
                  <Route path="/withdrawal-history" element={<WithdrawalHistory />} />
                  <Route path="/transactions"       element={<TransactionHistory />} />
                  <Route path="/referral"           element={<Referral />} />
                  <Route path="/profile"            element={<Profile />} />
                  <Route path="/notifications"      element={<Notifications />} />
                  <Route path="/matchmaking"        element={<Matchmaking />} />
                  <Route path="/game-room/:roomId"  element={<GameRoom />} />

                  {/* 🎮 Game Lobbies */}
                  <Route path="/games/poker"            element={<PokerLobbyPage />} />
                  <Route path="/games/andar-bahar"      element={<AndarBaharPage />} />
                  <Route path="/games/dice"             element={<DiceGame />} />
                  <Route path="/games/color-prediction" element={<ColorPrediction />} />
                  <Route path="/games/DragonTiger"      element={<DragonTigerPage />} />
                  <Route path="/games/ludo"             element={<LudoLobby />} />
          

                  {/* 🔐 Admin */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                </Route>

                {/* 🎮 Full-screen Game Pages (NO Layout) */}
                <Route path="/games/poker/:tableId"      element={<PokerGamePage />} />
                <Route path="/games/ludo/:tableId"       element={<LudoGame />} />
                <Route path="/games/RealLudo/RealLudoGame/:gameId"    element={<RealLudo />} />
              </Route>

              {/* ── Redirects ── */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </Suspense>

        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a0f2e',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
