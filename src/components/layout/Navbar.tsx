import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useHub } from '../../context/HubContext.tsx';
import { AvatarVisual } from '../common/AvatarVisual.tsx';

const NAV_LINKS = [
  { to: '/', label: 'Bosh sahifa' },
  { to: '/games', label: 'Barcha o‘yinlar' },
  { to: '/arena', label: '1v1 Arena' },
  { to: '/tournaments', label: 'Turnirlar' },
  { to: '/leaderboard', label: 'Reyting' },
];

export const Navbar: React.FC = () => {
  const { user } = useHub();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#06070A]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <NavLink
          to="/"
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          UZBEK GAMING HUB
        </NavLink>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-white border-[#FF6B00]'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Single primary action (Profil) + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#111520] hover:bg-[#171D2B] border border-white/10 transition-colors whitespace-nowrap shrink-0"
          >
            {user && <AvatarVisual avatarId={user.avatarId} size="sm" className="!w-7 !h-7 !rounded-lg" />}
            <span className="text-xs sm:text-sm font-semibold text-white max-w-[110px] truncate">
              {user ? user.username : 'Profil'}
            </span>
          </button>

          <button
            type="button"
            aria-label="Menyuni ochish"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg border border-white/10 text-slate-300 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#090B11] px-4 py-3 space-y-1">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-[#FF6B00]/15 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#00D2FF] hover:bg-white/5"
          >
            Profil va Admin
          </NavLink>
        </div>
      )}
    </header>
  );
};
