import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { MarketProvider, useMarket } from './context/MarketContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { StorefrontPage } from './pages/StorefrontPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { ProductDetailModal } from './components/store/ProductDetailModal.tsx';
import { CartCheckoutDrawer } from './components/store/CartCheckoutDrawer.tsx';

const MarketShell: React.FC = () => {
  const { toasts } = useMarket();

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0B0B0F]">
      <Header />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<StorefrontPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="bg-[#0B0B0F] text-neutral-400 border-t border-white/10 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-display text-sm font-extrabold text-white tracking-tight">
              OLOV MOBILE
            </span>
            <p className="text-neutral-500">
              Toshkent sh., Malika savdo majmuasi B-12 · Har kuni 09:00 – 21:00
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-neutral-300">
            <Link to="/" className="hover:text-[#FF5500] transition-colors">
              Katalog
            </Link>
            <Link to="/admin" className="hover:text-[#FF5500] transition-colors">
              Admin Panel
            </Link>
            <span className="text-neutral-500">
              © {new Date().getFullYear()} OLOV MOBILE
            </span>
          </div>
        </div>
      </footer>

      <ProductDetailModal />
      <CartCheckoutDrawer />

      {/* Toast Stack */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl border text-xs font-medium shadow-lg pointer-events-auto ${
              t.type === 'error'
                ? 'bg-red-950 border-red-500/40 text-red-100'
                : t.type === 'success'
                ? 'bg-[#0B0B0F] border-[#FF5500]/60 text-white'
                : 'bg-[#0B0B0F] border-white/15 text-white'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <MarketProvider>
        <MarketShell />
      </MarketProvider>
    </BrowserRouter>
  );
}
