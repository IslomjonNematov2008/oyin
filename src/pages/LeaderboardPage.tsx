import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { AvatarVisual } from '../components/common/AvatarVisual.tsx';
import { LeaderboardEntry, RankTier } from '../types/hub.ts';

const RANK_TIERS: Array<{ tier: RankTier; minXp: number; color: string }> = [
  { tier: 'Bronze', minXp: 0, color: 'text-amber-600' },
  { tier: 'Silver', minXp: 350, color: 'text-slate-300' },
  { tier: 'Gold', minXp: 950, color: 'text-amber-400' },
  { tier: 'Platinum', minXp: 1800, color: 'text-cyan-300' },
  { tier: 'Diamond', minXp: 3000, color: 'text-[#00D2FF]' },
  { tier: 'Master', minXp: 4500, color: 'text-[#FF6B00]' },
];

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, refreshLeaderboard, user } = useHub();
  const [ageGroup, setAgeGroup] = useState('Barchasi');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(leaderboard);

  useEffect(() => {
    refreshLeaderboard(ageGroup).then(setEntries).catch(() => {});
  }, [ageGroup, refreshLeaderboard]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-[#00D2FF] mb-1">GLOBAL VA TOIFA REYTINGI</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-[#FF6B00]" />
            <span>Reyting Jadvali</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bronze darajasidan Master ligasigacha bo‘lgan eng kuchli o‘yinchilar ro‘yxati.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-[#0D1018] p-1 rounded-xl border border-white/10">
          {['Barchasi', '16-17', '18-24', '25-34', '35+'].map((ag) => (
            <button
              key={ag}
              type="button"
              onClick={() => setAgeGroup(ag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                ageGroup === ag
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {ag === 'Barchasi' ? 'Global' : `${ag} yosh`}
            </button>
          ))}
        </div>
      </div>

      {/* Rank Tier Progression Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {RANK_TIERS.map((r) => (
          <div
            key={r.tier}
            className={`p-3.5 rounded-xl border bg-[#0D1018] ${
              user?.rank === r.tier ? 'border-[#FF6B00]' : 'border-white/10'
            }`}
          >
            <div className={`font-display font-bold text-sm ${r.color}`}>{r.tier}</div>
            <div className="font-mono text-xs text-slate-400 mt-0.5 tabular-nums">{r.minXp}+ XP</div>
          </div>
        ))}
      </div>

      {/* High-density tabular leaderboard */}
      <div className="bg-[#0D1018] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono text-slate-400 bg-[#090B11]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">O‘yinchi</th>
                <th className="py-3 px-4">Yosh toifasi</th>
                <th className="py-3 px-4">Daraja</th>
                <th className="py-3 px-4 text-right">O‘yinlar</th>
                <th className="py-3 px-4 text-right">G‘alaba %</th>
                <th className="py-3 px-4 text-right">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {entries.map((e, idx) => {
                const winPct = e.totalMatches > 0 ? Math.round((e.wins / e.totalMatches) * 100) : 0;
                const isMe = e.playerId === user?.playerId;
                return (
                  <tr
                    key={e.playerId}
                    className={isMe ? 'bg-[#FF6B00]/10' : 'hover:bg-white/[0.02]'}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarVisual avatarId={e.avatarId} size="sm" />
                        <div>
                          <div className="font-semibold text-white">
                            {e.username} {isMe && <span className="text-xs text-[#FF6B00]">(Siz)</span>}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">{e.playerId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">{e.ageGroup} yosh</td>
                    <td className="py-3 px-4 text-xs font-semibold text-[#00D2FF]">
                      {e.rank} · Lv.{e.level}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {e.wins}W / {e.losses}L
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 tabular-nums">
                      {winPct}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#FF6B00] tabular-nums">
                      {e.xp}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
