import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Crosshair, Flame, Trophy, CheckCircle2, ArrowRight, Swords } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { HeroBackdrop3D } from '../components/three/HeroBackdrop3D.tsx';
import { GameCard } from '../components/common/GameCard.tsx';
import { AvatarVisual } from '../components/common/AvatarVisual.tsx';
import { EligibleAgeGroup, GameItem } from '../types/hub.ts';
import { ARENA_MAPS } from '../components/arena/Arena1v1.tsx';

interface HomePageProps {
  onSelectGame: (game: GameItem) => void;
}

const AGE_TABS: Array<{ id: EligibleAgeGroup; label: string }> = [
  { id: '16-17', label: '16–17 yosh' },
  { id: '18-24', label: '18–24 yosh' },
  { id: '25-34', label: '25–34 yosh' },
  { id: '35+', label: '35+ yosh' },
];

export const HomePage: React.FC<HomePageProps> = ({ onSelectGame }) => {
  const { user, games, dailyChallenges, leaderboard, onlineCount, claimDailyChallenge } = useHub();
  const navigate = useNavigate();
  const [activeAgeTab, setActiveAgeTab] = useState<EligibleAgeGroup>(user?.ageGroup || '18-24');

  const featuredGames = games.filter((g) => g.featured).slice(0, 4);
  const popularGames = games.filter((g) => g.popular).slice(0, 4);
  const newGames = games.filter((g) => g.isNew).slice(0, 4);
  const multiplayerGames = games.filter((g) => g.multiplayer).slice(0, 4);
  const ageGames = games.filter((g) => g.ageGroup === activeAgeTab).slice(0, 4);

  const xpForNext = (user?.level || 1) * 250;
  const xpProgress = Math.min(100, Math.round((((user?.xp || 0) % 250) / 250) * 100));

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION WITH 3D ANIMATED BACKGROUND */}
      <section className="relative border-b border-white/10 overflow-hidden min-h-[460px] flex items-center">
        <div className="absolute inset-0">
          <HeroBackdrop3D />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070A] via-[#06070A]/80 to-transparent pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 w-full grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5 max-w-2xl"
          >
            <div className="text-xs font-mono text-[#00D2FF]">
              O‘ZBEKISTONNING KIBER O‘YIN EKOTIZIMI · {onlineCount} FAOL O‘YINCHI
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight [text-wrap:balance]">
              Keyingi avlod 3D o‘yinlar va jonli 1v1 kiber arena
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Yoshingizga mos 40 dan ortiq original 3D va strategik o‘yinlar, tezkor 1v1 bellashuvlar, turnirlar va global reyting tizimi.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/arena')}
                className="px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Crosshair className="w-4 h-4" />
                <span>1v1 Arenaga Kirish</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/games')}
                className="px-6 py-3 rounded-xl border border-white/15 bg-[#0D1018]/80 hover:bg-white/10 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>Barcha O‘yinlar ({games.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* User Profile Summary Card in Hero Right */}
          {user && (
            <div className="bg-[#0B0E16]/90 border border-white/12 rounded-2xl p-5 space-y-4 max-w-md lg:ml-auto w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AvatarVisual avatarId={user.avatarId} size="md" />
                  <div>
                    <div className="font-display font-bold text-lg text-white">{user.username}</div>
                    <div className="text-xs font-mono text-slate-400">
                      {user.playerId} · {user.ageGroup} yosh
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Liga</div>
                  <div className="font-display font-bold text-[#FF6B00]">{user.rank}</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Daraja {user.level}</span>
                  <span className="font-mono text-[#00D2FF] tabular-nums">
                    {user.xp} / {xpForNext} XP
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF6B00] to-[#00D2FF]"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center border-t border-white/10">
                <div className="pt-2">
                  <div className="font-mono text-base font-bold text-white tabular-nums">{user.totalMatches}</div>
                  <div className="text-[11px] text-slate-400">O‘yinlar</div>
                </div>
                <div className="pt-2">
                  <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">{user.wins}</div>
                  <div className="text-[11px] text-slate-400">G‘alaba</div>
                </div>
                <div className="pt-2">
                  <div className="font-mono text-base font-bold text-[#FF6B00] tabular-nums">
                    {user.totalMatches > 0 ? Math.round((user.wins / user.totalMatches) * 100) : 0}%
                  </div>
                  <div className="text-[11px] text-slate-400">G‘alaba %</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* 2. FEATURED GAMES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Tanlangan o‘yinlar</h2>
              <p className="text-xs text-slate-400 mt-0.5">Eng yuqori sifatli 3D va strategik tajribalar</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/games')}
              className="text-xs font-semibold text-[#00D2FF] hover:underline whitespace-nowrap"
            >
              Hammasini ko‘rish →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        </section>

        {/* 3. 1v1 ARENA SPOTLIGHT */}
        <section className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-center">
          <div className="space-y-4">
            <div className="text-xs font-mono text-[#FF6B00] flex items-center gap-1.5">
              <Swords className="w-4 h-4" /> ASOSIY XUSUSIYAT · 3D 1v1 ARENA
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Real-vaqt 1v1 taktik duelga tayyormisiz?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              5 ta original xarita — Cyber City, Desert Arena, Industrial Zone, Night City va Futuristic Base. Do‘stingizni xona kodi bilan taklif qiling yoki jonli raqib bilan kuch sinashing.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              {ARENA_MAPS.map((m, idx) => (
                <React.Fragment key={m.id}>
                  <span className="text-slate-200">{m.name}</span>
                  {idx < ARENA_MAPS.length - 1 && <span>·</span>}
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/arena')}
              className="px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Crosshair className="w-4 h-4" />
              <span>Arenani Ochish</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ARENA_MAPS.slice(0, 4).map((m) => (
              <div
                key={m.id}
                onClick={() => navigate('/arena')}
                className="relative h-32 rounded-xl overflow-hidden border border-white/10 cursor-pointer group"
              >
                <img
                  src={m.image}
                  alt={m.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-2.5 left-3 font-display font-bold text-sm text-white">
                  {m.name}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. AGE-CATEGORY GAME COLLECTIONS */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Yosh toifalari bo‘yicha to‘plamlar
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sizning toifangiz: <strong className="text-[#00D2FF]">{user?.ageGroup} yosh</strong> · Har bir toifada 10+ noyob o‘yin
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-[#0D1018] p-1 rounded-xl border border-white/10">
              {AGE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveAgeTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeAgeTab === t.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ageGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        </section>

        {/* 5. POPULAR + NEW + MULTIPLAYER */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6B00]" />
            <h2 className="font-display text-2xl font-bold text-white">Mashhur o‘yinlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">Yangi qo‘shilgan o‘yinlar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {newGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">Ko‘p o‘yinchili va raqobatli</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {multiplayerGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        </section>

        {/* 6. DAILY CHALLENGES & GLOBAL LEADERBOARD PREVIEW */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Challenges */}
          <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-white">Kunlik vazifalar</h2>
            <div className="space-y-3">
              {dailyChallenges.map((dc) => {
                const claimed = user?.dailyClaimedIds.includes(dc.id);
                return (
                  <div
                    key={dc.id}
                    className="p-4 rounded-xl bg-[#111520] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">{dc.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{dc.description}</div>
                      <div className="text-xs font-mono text-[#00D2FF] mt-1">+{dc.xpReward} XP</div>
                    </div>
                    <button
                      type="button"
                      disabled={claimed}
                      onClick={() => claimDailyChallenge(dc.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                        claimed
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-[#FF6B00] hover:bg-[#FF7D1F] text-white'
                      }`}
                    >
                      {claimed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{claimed ? 'Olingan' : 'Mukofotni olish'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Leaderboard Preview */}
          <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FF6B00]" />
                <h2 className="font-display text-xl font-bold text-white">Global Reyting</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/leaderboard')}
                className="text-xs text-[#00D2FF] font-semibold hover:underline"
              >
                To‘liq jadval →
              </button>
            </div>

            <div className="divide-y divide-white/10">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={entry.playerId} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-slate-400 w-6 tabular-nums">
                      0{idx + 1}
                    </span>
                    <AvatarVisual avatarId={entry.avatarId} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{entry.username}</div>
                      <div className="text-[11px] text-slate-400">
                        {entry.rank} · {entry.ageGroup} yosh
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-[#00D2FF] tabular-nums">{entry.xp} XP</div>
                    <div className="text-[11px] text-slate-400 tabular-nums">{entry.wins} g‘alaba</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
