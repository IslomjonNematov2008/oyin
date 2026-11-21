import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Plus, Trash2, Check, X } from 'lucide-react';
import { useHub } from '../context/HubContext.tsx';
import { EligibleAgeGroup, GameItem, ModerationReport, TournamentItem } from '../types/hub.ts';

interface AdminUserRow {
  id: string;
  playerId: string;
  username: string;
  ageGroup: EligibleAgeGroup;
  ageVerified: boolean;
  role: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  totalMatches: number;
  rank: string;
  status: 'active' | 'muted' | 'suspended';
}

export const AdminPage: React.FC = () => {
  const { apiFetch, setSession, notify, refreshGames } = useHub();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<'users' | 'games' | 'tournaments' | 'reports'>('users');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);

  // New game form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAge, setNewAge] = useState<EligibleAgeGroup>('18-24');
  const [newCategory, setNewCategory] = useState('3D Kiber Arena');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');

  // New tournament form
  const [trnTitle, setTrnTitle] = useState('');
  const [trnPrize, setTrnPrize] = useState('1200');

  const loadOverview = useCallback(async () => {
    const data = await apiFetch<{
      users: AdminUserRow[];
      games: GameItem[];
      tournaments: TournamentItem[];
      reports: ModerationReport[];
    }>('/api/admin/overview');
    setUsers(data.users);
    setGames(data.games);
    setTournaments(data.tournaments);
    setReports(data.reports);
  }, [apiFetch]);

  useEffect(() => {
    apiFetch<{ configured: boolean; isAdminSession: boolean }>('/api/admin/status')
      .then((s) => {
        setConfigured(s.configured);
        setIsAdmin(s.isAdminSession);
        if (s.isAdminSession) loadOverview();
      })
      .catch(() => {});
  }, [apiFetch, loadOverview]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const data = await apiFetch<{ user: any; token: string }>('/api/admin/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });
      setSession(data.user, data.token);
      setConfigured(true);
      setIsAdmin(true);
      setPasscode('');
      notify('Administrator paroli o‘rnatildi va tizimga kirildi!', 'success');
      loadOverview();
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const data = await apiFetch<{ user: any; token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });
      setSession(data.user, data.token);
      setIsAdmin(true);
      setPasscode('');
      notify('Administrator paneli ochildi.', 'success');
      loadOverview();
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const addGame = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiFetch<{ games: GameItem[] }>('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          ageGroup: newAge,
          category: newCategory,
        }),
      });
      setGames(data.games);
      setNewTitle('');
      setNewDesc('');
      refreshGames();
      notify('Yangi o‘yin qo‘shildi!', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const saveEditGame = async (id: string) => {
    try {
      const data = await apiFetch<{ games: GameItem[] }>(`/api/admin/games/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: editDesc }),
      });
      setGames(data.games);
      setEditingId(null);
      refreshGames();
      notify('O‘yin tavsifi yangilandi.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const deleteGame = async (id: string) => {
    try {
      const data = await apiFetch<{ games: GameItem[] }>(`/api/admin/games/${id}`, {
        method: 'DELETE',
      });
      setGames(data.games);
      refreshGames();
      notify('O‘yin o‘chirildi.', 'info');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiFetch<{ tournaments: TournamentItem[] }>('/api/admin/tournaments', {
        method: 'POST',
        body: JSON.stringify({ title: trnTitle, prizeXp: Number(trnPrize) }),
      });
      setTournaments(data.tournaments);
      setTrnTitle('');
      notify('Turnir yaratildi!', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const updateReport = async (id: string, status: ModerationReport['status']) => {
    try {
      const data = await apiFetch<{ reports: ModerationReport[] }>(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setReports(data.reports);
      notify('Shikoyat holati yangilandi.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  const updateUserStatus = async (id: string, status: AdminUserRow['status']) => {
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadOverview();
      notify('Foydalanuvchi holati yangilandi.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/40 flex items-center justify-center text-[#FF6B00]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">
                {configured === false
                  ? 'Birinchi Administratorni O‘rnatish'
                  : 'Administrator Kirishi'}
              </h1>
              <p className="text-xs text-slate-400">
                Server tomonidan himoyalangan RBAC boshqaruv paneli
              </p>
            </div>
          </div>

          <form onSubmit={configured === false ? handleBootstrap : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5">
                {configured === false
                  ? 'Yangi administrator paroli (kamida 8 belgi)'
                  : 'Administrator paroli'}
              </label>
              <input
                type="password"
                required
                minLength={configured === false ? 8 : 1}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#121622] border border-white/15 focus:border-[#00D2FF] focus:outline-none text-white"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-sm font-semibold"
            >
              {configured === false ? 'Parolni saqlash va kirish' : 'Panelga kirish'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-[#00D2FF] mb-1">RBAC BOSHQARUV TIZIMI</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Administrator Paneli
          </h1>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-[#0D1018] p-1 rounded-xl border border-white/10">
          {[
            { id: 'users', label: `Hisoblar (${users.length})` },
            { id: 'games', label: `O‘yinlar (${games.length})` },
            { id: 'tournaments', label: `Turnirlar (${tournaments.length})` },
            { id: 'reports', label: `Shikoyatlar (${reports.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-[#FF6B00] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#090B11] text-slate-400 font-mono">
                <th className="py-3 px-4">Player ID</th>
                <th className="py-3 px-4">Foydalanuvchi</th>
                <th className="py-3 px-4">Yosh toifasi</th>
                <th className="py-3 px-4">Statistika</th>
                <th className="py-3 px-4">Holat</th>
                <th className="py-3 px-4 text-right">Boshqaruv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-4 font-mono text-slate-400">{u.playerId}</td>
                  <td className="py-3 px-4 font-semibold text-white">{u.username}</td>
                  <td className="py-3 px-4 text-slate-300">{u.ageGroup} yosh</td>
                  <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                    {u.xp} XP · {u.wins}W/{u.losses}L
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        u.status === 'active'
                          ? 'text-emerald-400'
                          : u.status === 'muted'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => updateUserStatus(u.id, 'active')}
                      className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300"
                    >
                      Faol
                    </button>
                    <button
                      type="button"
                      onClick={() => updateUserStatus(u.id, 'suspended')}
                      className="px-2.5 py-1 rounded bg-red-500/15 text-red-300"
                    >
                      Bloklash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GAMES TAB */}
      {tab === 'games' && (
        <div className="space-y-5">
          <form
            onSubmit={addGame}
            className="bg-[#0D1018] border border-white/10 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Yangi o‘yin nomi"
              className="px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white"
            />
            <input
              type="text"
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="O‘yin tavsifi (o‘zbek tilida)"
              className="px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white sm:col-span-2"
            />
            <div className="flex gap-2">
              <select
                value={newAge}
                onChange={(e) => setNewAge(e.target.value as EligibleAgeGroup)}
                className="px-2.5 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white flex-1"
              >
                <option value="16-17">16–17</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35+">35+</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Qo‘shish
              </button>
            </div>
          </form>

          <div className="bg-[#0D1018] border border-white/10 rounded-2xl divide-y divide-white/10">
            {games.map((g) => (
              <div key={g.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex-1 min-w-[240px]">
                  <div className="font-semibold text-white">
                    {g.title} · <span className="text-[#00D2FF]">{g.ageGroup} yosh</span>
                  </div>
                  {editingId === g.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#121622] border border-[#00D2FF] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditGame(g.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        Saqlash
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 mt-0.5">{g.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(g.id);
                      setEditDesc(g.description);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteGame(g.id)}
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOURNAMENTS TAB */}
      {tab === 'tournaments' && (
        <div className="space-y-5">
          <form
            onSubmit={createTournament}
            className="bg-[#0D1018] border border-white/10 rounded-2xl p-5 flex flex-wrap gap-3"
          >
            <input
              type="text"
              required
              value={trnTitle}
              onChange={(e) => setTrnTitle(e.target.value)}
              placeholder="Turnir nomi"
              className="flex-1 min-w-[200px] px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white"
            />
            <input
              type="number"
              value={trnPrize}
              onChange={(e) => setTrnPrize(e.target.value)}
              placeholder="Mukofot XP"
              className="w-36 px-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold"
            >
              Turnir yaratish
            </button>
          </form>

          <div className="bg-[#0D1018] border border-white/10 rounded-2xl divide-y divide-white/10">
            {tournaments.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{t.title}</div>
                  <div className="text-slate-400">
                    {t.arenaMap} · {t.participants.length}/{t.maxPlayers} ishtirokchi
                  </div>
                </div>
                <div className="font-mono text-[#00D2FF]">+{t.prizeXp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {tab === 'reports' && (
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl divide-y divide-white/10">
          {reports.map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-semibold text-white">
                  {r.targetUsername} <span className="text-slate-400">({r.reason})</span>
                </div>
                <div className="text-slate-400 mt-0.5">{r.details}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Yuboruvchi: {r.reporterUsername} · Holat: {r.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateReport(r.id, 'Ko‘rib chiqildi')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Tasdiqlash
                </button>
                <button
                  type="button"
                  onClick={() => updateReport(r.id, 'Rad etildi')}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Rad etish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
