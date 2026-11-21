import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { GameCard } from '../components/common/GameCard.tsx';
import { EligibleAgeGroup, GameItem } from '../types/hub.ts';

interface GamesLibraryPageProps {
  onSelectGame: (game: GameItem) => void;
}

export const GamesLibraryPage: React.FC<GamesLibraryPageProps> = ({ onSelectGame }) => {
  const { games, user } = useHub();
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState<'Barchasi' | EligibleAgeGroup>('Barchasi');
  const [categoryFilter, setCategoryFilter] = useState<string>('Barchasi');

  const categories = useMemo(() => {
    const set = new Set(games.map((g) => g.category));
    return ['Barchasi', ...Array.from(set)];
  }, [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (ageFilter !== 'Barchasi' && g.ageGroup !== ageFilter) return false;
      if (categoryFilter !== 'Barchasi' && g.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [games, ageFilter, categoryFilter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-[#00D2FF] mb-1">
            YOSHGA MOSLASHTIRILGAN KUTUBXONA · {games.length} TA O‘YIN
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Barcha O‘yinlar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sizning yosh toifangiz ({user?.ageGroup} yosh) va barcha 16+ kategoriyalar bo‘yicha noyob o‘yinlar.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O‘yin qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1018] border border-white/10 focus:border-[#00D2FF] focus:outline-none text-sm text-white"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1018] border border-white/10 rounded-2xl p-3">
        <div className="flex flex-wrap gap-1.5">
          {(['Barchasi', '16-17', '18-24', '25-34', '35+'] as const).map((ag) => (
            <button
              key={ag}
              type="button"
              onClick={() => setAgeFilter(ag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                ageFilter === ag
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {ag === 'Barchasi' ? 'Barcha yoshlar' : `${ag} yosh`}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[#121722] border border-white/10 text-xs text-white focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              Janr: {cat}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#0D1018] border border-white/10 rounded-2xl">
          <p className="text-sm text-slate-400">So‘rovingiz bo‘yicha o‘yin topilmadi.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setAgeFilter('Barchasi');
              setCategoryFilter('Barchasi');
            }}
            className="mt-3 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold"
          >
            Filtrlarni tozalash
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} onPlay={onSelectGame} />
          ))}
        </div>
      )}
    </div>
  );
};
