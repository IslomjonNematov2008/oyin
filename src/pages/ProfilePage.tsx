import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, Shield, LogOut, Flag, Settings } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { AvatarVisual } from '../components/common/AvatarVisual.tsx';
import { GameCard } from '../components/common/GameCard.tsx';
import { GameItem } from '../types/hub.ts';

interface ProfilePageProps {
  onSelectGame: (game: GameItem) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onSelectGame }) => {
  const { user, games, submitReport, logout } = useHub();
  const navigate = useNavigate();

  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('Qoidabuzarlik');
  const [reportDetails, setReportDetails] = useState('');

  if (!user) return null;

  const winRate = user.totalMatches > 0 ? Math.round((user.wins / user.totalMatches) * 100) : 0;
  const xpForNext = user.level * 250;
  const xpPct = Math.min(100, Math.round(((user.xp % 250) / 250) * 100));
  const favGames = games.filter((g) => user.favoriteGames.includes(g.id));

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submitReport(reportTarget, reportReason, reportDetails);
    if (ok) {
      setReportTarget('');
      setReportDetails('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-16">
      {/* Profile Hero Header */}
      <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <AvatarVisual avatarId={user.avatarId} size="lg" />
          <div>
            <div className="text-xs font-mono text-[#00D2FF]">
              ID: {user.playerId} · {user.ageGroup} yosh · Tasdiqlangan
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
              {user.username}
            </h1>
            <div className="text-xs text-slate-400 mt-1">
              Liga: <strong className="text-[#FF6B00]">{user.rank}</strong> · Daraja {user.level}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-4 py-2.5 rounded-xl border border-[#00D2FF]/40 bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-[#7DD3FC] text-xs font-semibold flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Administrator Paneli</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-xs font-semibold flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      {/* XP Bar + Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-white">Tajriba va Daraja Taraqqiyoti</span>
            <span className="font-mono text-[#00D2FF] tabular-nums">
              {user.xp} / {xpForNext} XP
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-[#FF6B00] to-[#00D2FF]"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: 'Jami o‘yinlar', val: user.totalMatches, color: 'text-white' },
              { label: 'G‘alabalar', val: user.wins, color: 'text-emerald-400' },
              { label: 'Mag‘lubiyatlar', val: user.losses, color: 'text-red-400' },
              { label: 'G‘alaba foizi', val: `${winRate}%`, color: 'text-[#FF6B00]' },
            ].map((s) => (
              <div key={s.label} className="bg-[#121622] border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">{s.label}</div>
                <div className={`font-mono text-xl font-bold mt-0.5 tabular-nums ${s.color}`}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Assurance Summary */}
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-[#00D2FF] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Yosh va Maxfiylik Himoyasi
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tasdiqlash usuli: <strong className="text-slate-200">{user.assuranceMethod}</strong>. Shaxsiy hujjatlar yoki rasmlar platformada saqlanmaydi.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 border-t border-white/10 pt-3">
            A’zo bo‘lgan sana: {new Date(user.joinedAt).toLocaleDateString('uz-UZ')}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FF6B00]" />
          <span>Yutuq Nishonlari ({user.achievements.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {user.achievements.map((ach) => (
            <motion.div
              key={ach.id}
              whileHover={{ y: -3 }}
              className="bg-[#0D1018] border border-white/10 rounded-2xl p-4 space-y-2"
            >
              <div className="text-[11px] font-mono text-[#FF6B00]">
                {ach.tier.toUpperCase()} NISHON
              </div>
              <div className="font-display font-bold text-base text-white">{ach.title}</div>
              <p className="text-xs text-slate-400">{ach.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Favorite Games */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Sevimli o‘yinlar ({favGames.length})
        </h2>
        {favGames.length === 0 ? (
          <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 text-xs text-slate-400">
            Hali sevimli o‘yinlar qo‘shilmagan. Istalgan o‘yin oynasida yurakcha belgisini bosing.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favGames.map((g) => (
              <GameCard key={g.id} game={g} onPlay={onSelectGame} />
            ))}
          </div>
        )}
      </section>

      {/* Match History & Report Form */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-white">O‘yinlar Tarixi</h2>
          {user.matchHistory.length === 0 ? (
            <p className="text-xs text-slate-400">Hali o‘yinlar tarixi mavjud emas.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {user.matchHistory.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-white">{m.opponentName}</div>
                    <div className="text-slate-400 mt-0.5">
                      {m.mode} · {new Date(m.playedAt).toLocaleString('uz-UZ')}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div
                      className={`font-bold ${
                        m.result === 'G‘alaba' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {m.result}
                    </div>
                    <div className="text-[#00D2FF] tabular-nums">+{m.xpEarned} XP</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleReportSubmit}
          className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#FF6B00]" />
            <h2 className="font-display text-lg font-bold text-white">Shikoyat yuborish</h2>
          </div>
          <input
            type="text"
            required
            value={reportTarget}
            onChange={(e) => setReportTarget(e.target.value)}
            placeholder="O‘yinchi nomi"
            className="w-full px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white focus:border-[#00D2FF] focus:outline-none"
          />
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white focus:outline-none"
          >
            <option value="Qoidabuzarlik">Qoidabuzarlik / Noqonuniy dastur</option>
            <option value="Haqoratli xatti-harakat">Haqoratli xatti-harakat</option>
            <option value="Nomaqbul kontent">Nomaqbul kontent</option>
          </select>
          <textarea
            rows={3}
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            placeholder="Tafsilotlarni yozing..."
            className="w-full px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white focus:border-[#00D2FF] focus:outline-none"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-xs font-semibold"
          >
            Administratorga yuborish
          </button>
        </form>
      </div>
    </div>
  );
};
