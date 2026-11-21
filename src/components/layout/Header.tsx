import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, ShoppingBag, X } from 'lucide-react';
import { useMarket } from '../../context/MarketContext.tsx';
import { PhoneBrand, PhoneCategory } from '../../types/market.ts';

const BRAND_MENU: Array<{ label: string; value: PhoneBrand | 'Barchasi' }> = [
  { label: 'Barcha brendlar', value: 'Barchasi' },
  { label: 'Apple iPhone', value: 'Apple' },
  { label: 'Samsung Galaxy', value: 'Samsung' },
  { label: 'Xiaomi / Leica', value: 'Xiaomi' },
  { label: 'Google Pixel', value: 'Google' },
  { label: 'Nothing Phone', value: 'Nothing' },
];

const CATEGORY_MENU: Array<{ label: string; value: PhoneCategory | 'Barchasi' }> = [
  { label: 'Barcha toifalar', value: 'Barchasi' },
  { label: 'Olovrang nashr', value: 'Olovrang nashr' },
  { label: 'Flagman', value: 'Flagman' },
  { label: 'Buklanadigan', value: 'Buklanadigan' },
  { label: 'O‘rta sinf', value: 'O‘rta sinf' },
];

export const Header: React.FC = () => {
  const {
    cartCount,
    setIsCartOpen,
    setBrandFilter,
    setCategoryFilter,
    brandFilter,
    categoryFilter,
  } = useMarket();
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    setMegaMenuOpen(false);
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const applyBrandFromMenu = (brand: PhoneBrand | 'Barchasi') => {
    setBrandFilter(brand);
    setCategoryFilter('Barchasi');
    scrollToSection('katalog');
  };

  const applyCategoryFromMenu = (cat: PhoneCategory | 'Barchasi') => {
    setCategoryFilter(cat);
    setBrandFilter('Barchasi');
    scrollToSection('katalog');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0F] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <Link
          to="/"
          onClick={() => {
            setMegaMenuOpen(false);
            setMobileMenuOpen(false);
          }}
          className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-xs bg-[#FF5500]" aria-hidden="true" />
          <span>OLOV MOBILE</span>
        </Link>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <button
            type="button"
            onClick={() => scrollToSection('katalog')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Katalog
          </button>

          <button
            type="button"
            onClick={() => setMegaMenuOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              megaMenuOpen ? 'text-[#FF5500]' : 'hover:text-white'
            }`}
            aria-expanded={megaMenuOpen}
          >
            <span>Menyu</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                megaMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('kuzatuv')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Buyurtma holati
          </button>

          <Link
            to="/admin"
            onClick={() => setMegaMenuOpen(false)}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/admin'
                ? 'text-[#FF5500]'
                : 'hover:text-white'
            }`}
          >
            Admin Panel
          </Link>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5500] hover:bg-[#E04800] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Savat</span>
            <span className="font-mono tabular-nums">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Menyuni ochish"
            className="md:hidden p-2 rounded-lg border border-white/15 text-white hover:border-[#FF5500] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Interactive Mega-Menu */}
      {megaMenuOpen && (
        <div className="hidden md:block bg-[#141419] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-8">
            <div className="col-span-5">
              <p className="text-xs font-medium text-neutral-400 mb-3">Brendlar bo‘yicha</p>
              <div className="grid grid-cols-2 gap-2">
                {BRAND_MENU.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => applyBrandFromMenu(b.value)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      brandFilter === b.value
                        ? 'bg-[#FF5500] text-white'
                        : 'text-neutral-200 hover:bg-white/10'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-4 border-l border-white/10 pl-8">
              <p className="text-xs font-medium text-neutral-400 mb-3">Toifalar</p>
              <div className="space-y-1.5">
                {CATEGORY_MENU.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => applyCategoryFromMenu(c.value)}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      categoryFilter === c.value
                        ? 'text-[#FF5500] font-semibold bg-white/5'
                        : 'text-neutral-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-3 border-l border-white/10 pl-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#FF5500] mb-1">Tezkor buyurtma</p>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Har bir buyurtma rasmiylashtirilishi bilan Telegram kanalimizga real vaqt rejimida yuboriladi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMegaMenuOpen(false);
                  setIsCartOpen(true);
                }}
                className="mt-4 w-full py-2 px-4 rounded-lg bg-white text-[#0B0B0F] hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Buyurtma berish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Interactive Slide-Down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#141419] border-t border-white/10 px-4 py-4 space-y-4">
          <div className="flex flex-col space-y-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => scrollToSection('katalog')}
              className="text-left py-2 px-3 rounded-lg hover:bg-white/10 text-white"
            >
              Smartfonlar katalogi
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kuzatuv')}
              className="text-left py-2 px-3 rounded-lg hover:bg-white/10 text-white"
            >
              Buyurtma holatini tekshirish
            </button>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-white/10 text-[#FF5500]"
            >
              Admin Panel
            </Link>
          </div>

          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-neutral-400 mb-2">Tezkor brendlar</p>
            <div className="flex flex-wrap gap-2">
              {BRAND_MENU.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => applyBrandFromMenu(b.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    brandFilter === b.value
                      ? 'bg-[#FF5500] text-white'
                      : 'bg-white/10 text-neutral-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
