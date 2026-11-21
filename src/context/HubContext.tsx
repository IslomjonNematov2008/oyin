import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  DailyChallenge,
  GameItem,
  LeaderboardEntry,
  TournamentItem,
  UserProfile,
} from '../types/hub.ts';

interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error';
}

interface HubContextValue {
  user: UserProfile | null;
  token: string | null;
  games: GameItem[];
  tournaments: TournamentItem[];
  dailyChallenges: DailyChallenge[];
  leaderboard: LeaderboardEntry[];
  onlineCount: number;
  socket: Socket | null;
  toasts: ToastMessage[];
  loadingHub: boolean;
  notify: (text: string, type?: 'info' | 'success' | 'error') => void;
  setSession: (user: UserProfile, token: string) => void;
  refreshHub: () => Promise<void>;
  refreshGames: () => Promise<void>;
  refreshLeaderboard: (ageGroup?: string) => Promise<LeaderboardEntry[]>;
  completeGame: (gameId: string, score: number, won: boolean) => Promise<number>;
  completePracticeMatch: (arenaMap: string, playerScore: number, botScore: number, won: boolean) => Promise<void>;
  toggleFavorite: (gameId: string) => Promise<void>;
  claimDailyChallenge: (challengeId: string) => Promise<void>;
  joinTournament: (tournamentId: string) => Promise<void>;
  submitReport: (targetUsername: string, reason: string, details: string) => Promise<boolean>;
  apiFetch: <T>(url: string, options?: RequestInit) => Promise<T>;
  logout: () => void;
}

const HubContext = createContext<HubContextValue | null>(null);

export const HubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [loadingHub, setLoadingHub] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);

  const notify = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Server xatoligi yuz berdi.');
      }
      return data as T;
    },
    [token]
  );

  const refreshHub = useCallback(async () => {
    if (!token) return;
    setLoadingHub(true);
    try {
      const res = await fetch('/api/hub/bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Ma’lumotlarni yuklab bo‘lmadi');
      const data = await res.json();
      if (data.user) setUser(data.user);
      if (Array.isArray(data.games)) setGames(data.games);
      if (Array.isArray(data.tournaments)) setTournaments(data.tournaments);
      if (Array.isArray(data.dailyChallenges)) setDailyChallenges(data.dailyChallenges);
      if (Array.isArray(data.leaderboard)) setLeaderboard(data.leaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHub(false);
    }
  }, [token]);

  const refreshGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (Array.isArray(data.games)) setGames(data.games);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshLeaderboard = useCallback(async (ageGroup?: string) => {
    const q = ageGroup && ageGroup !== 'Barchasi' ? `?ageGroup=${encodeURIComponent(ageGroup)}` : '';
    const res = await fetch(`/api/leaderboard${q}`);
    const data = await res.json();
    if (!ageGroup || ageGroup === 'Barchasi') {
      setLeaderboard(data.leaderboard || []);
    }
    return (data.leaderboard || []) as LeaderboardEntry[];
  }, []);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketState(null);
      }
      return;
    }

    refreshHub();

    const s = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = s;
    setSocketState(s);

    s.on('hub:online_count', ({ count }: { count: number }) => {
      setOnlineCount(Math.max(1, count));
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocketState(null);
    };
  }, [token, refreshHub]);

  const setSession = useCallback((newUser: UserProfile, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
  }, []);

  const completeGame = useCallback(
    async (gameId: string, score: number, won: boolean) => {
      const data = await apiFetch<{ user: UserProfile; xpEarned: number }>('/api/games/complete', {
        method: 'POST',
        body: JSON.stringify({ gameId, score, won }),
      });
      setUser(data.user);
      refreshLeaderboard();
      notify(`+${data.xpEarned} XP qo‘shildi!`, 'success');
      return data.xpEarned;
    },
    [apiFetch, notify, refreshLeaderboard]
  );

  const completePracticeMatch = useCallback(
    async (arenaMap: string, playerScore: number, botScore: number, won: boolean) => {
      const data = await apiFetch<{ user: UserProfile; xpEarned: number }>(
        '/api/arena/practice-complete',
        {
          method: 'POST',
          body: JSON.stringify({ arenaMap, playerScore, botScore, won }),
        }
      );
      setUser(data.user);
      refreshLeaderboard();
      notify(`Mashq yakunlandi: +${data.xpEarned} XP`, 'success');
    },
    [apiFetch, notify, refreshLeaderboard]
  );

  const toggleFavorite = useCallback(
    async (gameId: string) => {
      const data = await apiFetch<{ user: UserProfile }>('/api/profile/favorite', {
        method: 'POST',
        body: JSON.stringify({ gameId }),
      });
      setUser(data.user);
    },
    [apiFetch]
  );

  const claimDailyChallenge = useCallback(
    async (challengeId: string) => {
      try {
        const data = await apiFetch<{ user: UserProfile }>('/api/challenges/claim', {
          method: 'POST',
          body: JSON.stringify({ challengeId }),
        });
        setUser(data.user);
        refreshLeaderboard();
        notify('Kunlik vazifa mukofoti hisobingizga o‘tkazildi!', 'success');
      } catch (err) {
        notify((err as Error).message, 'error');
      }
    },
    [apiFetch, notify, refreshLeaderboard]
  );

  const joinTournament = useCallback(
    async (tournamentId: string) => {
      try {
        const data = await apiFetch<{ tournaments: TournamentItem[] }>('/api/tournaments/join', {
          method: 'POST',
          body: JSON.stringify({ tournamentId }),
        });
        setTournaments(data.tournaments);
        notify('Turnirga muvaffaqiyatli ro‘yxatdan o‘tdingiz!', 'success');
      } catch (err) {
        notify((err as Error).message, 'error');
      }
    },
    [apiFetch, notify]
  );

  const submitReport = useCallback(
    async (targetUsername: string, reason: string, details: string) => {
      try {
        await apiFetch('/api/reports', {
          method: 'POST',
          body: JSON.stringify({ targetUsername, reason, details }),
        });
        notify('Shikoyat moderatsiya bo‘limiga yuborildi.', 'success');
        return true;
      } catch (err) {
        notify((err as Error).message, 'error');
        return false;
      }
    },
    [apiFetch, notify]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketState(null);
    }
  }, []);

  return (
    <HubContext.Provider
      value={{
        user,
        token,
        games,
        tournaments,
        dailyChallenges,
        leaderboard,
        onlineCount,
        socket: socketState,
        toasts,
        loadingHub,
        notify,
        setSession,
        refreshHub,
        refreshGames,
        refreshLeaderboard,
        completeGame,
        completePracticeMatch,
        toggleFavorite,
        claimDailyChallenge,
        joinTournament,
        submitReport,
        apiFetch,
        logout,
      }}
    >
      {children}
    </HubContext.Provider>
  );
};

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub must be used within HubProvider');
  return ctx;
}
