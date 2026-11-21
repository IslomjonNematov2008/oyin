import React from 'react';
import { Calendar, Trophy, Users, CheckCircle2 } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { ARENA_MAPS } from '../components/arena/Arena1v1.tsx';

export const TournamentsPage: React.FC = () => {
  const { tournaments, user, joinTournament } = useHub();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      <div>
        <p className="text-xs font-mono text-[#00D2FF] mb-1">RASMIY MUSOBAQALAR</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Turnirlar</h1>
        <p className="text-sm text-slate-400 mt-1">
          1v1 arena turnirlariga ro‘yxatdan o‘ting va qo‘shimcha XP hamda daraja ochkolari yuting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tournaments.map((trn) => {
          const mapInfo = ARENA_MAPS.find((m) => m.id === trn.arenaMap) || ARENA_MAPS[0];
          const joined = user ? trn.participants.includes(user.username) : false;
          const full = trn.participants.length >= trn.maxPlayers;

          return (
            <div
              key={trn.id}
              className="bg-[#0D1018] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="h-40 relative">
                <img
                  src={mapInfo.image}
                  alt={trn.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1018] via-[#0D1018]/35 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-[11px] font-mono text-[#00D2FF]">
                    {mapInfo.name} · {trn.ageGroup} · {trn.status}
                  </div>
                  <h2 className="font-display text-lg font-bold text-white mt-0.5">{trn.title}</h2>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#121622] border border-white/10 rounded-xl p-3">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-[#FF6B00]" /> Mukofot
                    </div>
                    <div className="font-mono font-bold text-white mt-1 tabular-nums">
                      +{trn.prizeXp} XP
                    </div>
                  </div>
                  <div className="bg-[#121622] border border-white/10 rounded-xl p-3">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#00D2FF]" /> Ishtirokchilar
                    </div>
                    <div className="font-mono font-bold text-white mt-1 tabular-nums">
                      {trn.participants.length} / {trn.maxPlayers}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Boshlanish sanasi: {new Date(trn.startsAt).toLocaleDateString('uz-UZ')}</span>
                </div>

                <button
                  type="button"
                  disabled={joined || full}
                  onClick={() => joinTournament(trn.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    joined
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : full
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-[#FF6B00] hover:bg-[#FF7D1F] text-white'
                  }`}
                >
                  {joined && <CheckCircle2 className="w-4 h-4" />}
                  <span>
                    {joined ? 'Ro‘yxatdan o‘tilgan' : full ? 'Joylar to‘lgan' : 'Turnirga qo‘shilish'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
