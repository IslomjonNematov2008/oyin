import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HubProvider, useHub } from './context/HubContext.tsx';
import { RegistrationFlow } from './components/onboarding/RegistrationFlow.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { GamesLibraryPage } from './pages/GamesLibraryPage.tsx';
import { Arena1v1 } from './components/arena/Arena1v1.tsx';
import { TournamentsPage } from './pages/TournamentsPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { GamePlayModal } from './components/games/GamePlayModal.tsx';
import { GameItem } from './types/hub.ts';

const HubShell: React.FC = () => {
  const { user, toasts } = useHub();
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);

  return (
    <>
      {!user ? (
        <RegistrationFlow />
      ) : (
        <div className="min-h-screen flex flex-col bg-[#06070A] text-slate-100">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage onSelectGame={setActiveGame} />} />
              <Route path="/games" element={<GamesLibraryPage onSelectGame={setActiveGame} />} />
              <Route path="/arena" element={<Arena1v1 />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage onSelectGame={setActiveGame} />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-white/10 bg-[#080A0F] py-6 px-4 sm:px-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <span className="font-display font-semibold text-slate-300">
                UZBEK GAMING HUB
              </span>
              <span>
                © {new Date().getFullYear()} UZBEK GAMING HUB · 16+ yoshga moslashtirilgan xavfsiz o‘yin ekotizimi
              </span>
            </div>
          </footer>

          <GamePlayModal game={activeGame} onClose={() => setActiveGame(null)} />
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl border text-xs font-medium shadow-xl pointer-events-auto ${
              t.type === 'error'
                ? 'bg-red-950/95 border-red-500/50 text-red-100'
                : t.type === 'success'
                ? 'bg-[#0D171C]/95 border-[#00D2FF]/50 text-[#E0F2FE]'
                : 'bg-[#0D1018]/95 border-white/15 text-slate-100'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <HubProvider>
        <HubShell />
      </HubProvider>
    </BrowserRouter>
  );
}
