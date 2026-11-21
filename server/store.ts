import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AchievementBadge,
  DailyChallenge,
  EligibleAgeGroup,
  GameItem,
  LeaderboardEntry,
  MatchRecord,
  ModerationReport,
  RankTier,
  TournamentItem,
  UserProfile,
} from '../src/types/hub.ts';
import { INITIAL_GAMES_CATALOG } from '../src/data/gamesCatalog.ts';

export interface StoreData {
  users: Record<string, UserProfile>;
  usernameIndex: Record<string, string>; // lowercase username -> userId
  games: GameItem[];
  tournaments: TournamentItem[];
  reports: ModerationReport[];
  dailyChallenges: DailyChallenge[];
  adminCredentialHash: string | null; // salt:scryptHash
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'hub-store.json');

export function computeRankTier(xp: number): RankTier {
  if (xp >= 4500) return 'Master';
  if (xp >= 3000) return 'Diamond';
  if (xp >= 1800) return 'Platinum';
  if (xp >= 950) return 'Gold';
  if (xp >= 350) return 'Silver';
  return 'Bronze';
}

export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 250) + 1);
}

function seedUsers(): { users: Record<string, UserProfile>; usernameIndex: Record<string, string> } {
  const seedList: Array<{
    username: string;
    ageGroup: EligibleAgeGroup;
    xp: number;
    wins: number;
    losses: number;
    avatarId: string;
  }> = [
    { username: 'AmirTemur_UZ', ageGroup: '25-34', xp: 4820, wins: 44, losses: 11, avatarId: 'cyber_helmet' },
    { username: 'SamarqandWolf', ageGroup: '18-24', xp: 3490, wins: 31, losses: 9, avatarId: 'neon_visor' },
    { username: 'ToshkentCyber', ageGroup: '18-24', xp: 2450, wins: 22, losses: 12, avatarId: 'orange_titan' },
    { username: 'BuxoroStorm', ageGroup: '16-17', xp: 1420, wins: 15, losses: 8, avatarId: 'aqua_falcon' },
    { username: 'NavoiyStrateg', ageGroup: '35+', xp: 1980, wins: 19, losses: 6, avatarId: 'gold_sentinel' },
    { username: 'XivaHunter', ageGroup: '25-34', xp: 780, wins: 8, losses: 7, avatarId: 'obsidian_core' },
  ];

  const users: Record<string, UserProfile> = {};
  const usernameIndex: Record<string, string> = {};

  seedList.forEach((s, idx) => {
    const id = `seed-user-${idx + 1}`;
    const playerId = `UZG-${1042 + idx * 117}`;
    const totalMatches = s.wins + s.losses;
    const rank = computeRankTier(s.xp);
    const level = computeLevel(s.xp);

    const achievements: AchievementBadge[] = [
      {
        id: 'ach-welcome',
        title: 'Platforma A’zosi',
        description: 'UZBEK GAMING HUB ekotizimiga muvaffaqiyatli qo‘shildi.',
        tier: 'bronze',
        unlockedAt: '2026-10-12T10:00:00Z',
      },
    ];
    if (s.wins >= 10) {
      achievements.push({
        id: 'ach-10-wins',
        title: 'Arena Jangchisi',
        description: '10 ta g‘alaba marrasini zabt etdi.',
        tier: 'silver',
        unlockedAt: '2026-10-20T14:30:00Z',
      });
    }
    if (s.xp >= 3000) {
      achievements.push({
        id: 'ach-diamond',
        title: 'Kiber Elita',
        description: '3000+ XP va yuqori liga darajasiga ko‘tarildi.',
        tier: 'diamond',
        unlockedAt: '2026-11-01T18:15:00Z',
      });
    }

    users[id] = {
      id,
      playerId,
      username: s.username,
      avatarId: s.avatarId,
      ageGroup: s.ageGroup,
      ageVerified: true,
      assuranceMethod: 'UzTrust Zero-Knowledge AgeGate',
      role: 'player',
      level,
      xp: s.xp,
      totalMatches,
      wins: s.wins,
      losses: s.losses,
      rank,
      achievements,
      favoriteGames: ['kiber-poyga-16', 'taktik-shaxmat-25'],
      matchHistory: [
        {
          id: `m-seed-${idx}`,
          arenaMap: 'cyber_city',
          mode: '1v1 Online',
          opponentName: 'SamarqandWolf',
          playerScore: 2,
          opponentScore: 1,
          result: 'G‘alaba',
          xpEarned: 120,
          playedAt: '2026-11-18T16:40:00Z',
        },
      ],
      dailyClaimedIds: [],
      joinedAt: '2026-10-12T10:00:00Z',
      status: 'active',
    };
    usernameIndex[s.username.toLowerCase()] = id;
  });

  return { users, usernameIndex };
}

function createInitialStore(): StoreData {
  const { users, usernameIndex } = seedUsers();

  const dailyChallenges: DailyChallenge[] = [
    {
      id: 'dc-1',
      title: '1v1 Arenada Bellashing',
      description: '3D 1v1 arenada kamida bitta jangni yakunlang va qo‘shimcha XP oling.',
      xpReward: 150,
      targetCount: 1,
      category: '1v1 Arena',
    },
    {
      id: 'dc-2',
      title: 'Kiber Kutubxona Tadqiqotchisi',
      description: 'O‘zingizning yosh toifangizdagi istalgan o‘yinni o‘ynab natija qayd eting.',
      xpReward: 100,
      targetCount: 1,
      category: 'O‘yinlar',
    },
    {
      id: 'dc-3',
      title: 'Mantiq va Aniqlik',
      description: 'Shaxmat, Sudoku yoki 3D Labirint o‘yinlaridan birida g‘alaba qozoning.',
      xpReward: 180,
      targetCount: 1,
      category: 'Mantiq',
    },
  ];

  const tournaments: TournamentItem[] = [
    {
      id: 'trn-1',
      title: 'Toshkent Kiber Kubogi (1v1)',
      arenaMap: 'cyber_city',
      ageGroup: '18-24',
      prizeXp: 1200,
      maxPlayers: 16,
      participants: ['AmirTemur_UZ', 'SamarqandWolf', 'ToshkentCyber'],
      status: 'Ro‘yxatdan o‘tish',
      startsAt: '2026-11-24T19:00:00Z',
    },
    {
      id: 'trn-2',
      title: 'Sahro Taktik Turniri',
      arenaMap: 'desert_arena',
      ageGroup: 'Barchasi',
      prizeXp: 1500,
      maxPlayers: 32,
      participants: ['AmirTemur_UZ', 'BuxoroStorm', 'NavoiyStrateg', 'XivaHunter'],
      status: 'Faol',
      startsAt: '2026-11-21T18:00:00Z',
    },
    {
      id: 'trn-3',
      title: 'Sanoat Baza Grand Prix',
      arenaMap: 'industrial_zone',
      ageGroup: '25-34',
      prizeXp: 950,
      maxPlayers: 16,
      participants: ['AmirTemur_UZ', 'XivaHunter'],
      status: 'Ro‘yxatdan o‘tish',
      startsAt: '2026-11-28T17:00:00Z',
    },
  ];

  const reports: ModerationReport[] = [
    {
      id: 'rep-1',
      reporterUsername: 'ToshkentCyber',
      targetUsername: 'XivaHunter',
      reason: 'Chat qoidabuzarligi',
      details: 'O‘yin vaqtida nomaqbul iboralar ishlatilgani bo‘yicha tekshiruv so‘rovi.',
      status: 'Kutilmoqda',
      createdAt: '2026-11-20T12:15:00Z',
    },
  ];

  return {
    users,
    usernameIndex,
    games: [...INITIAL_GAMES_CATALOG],
    tournaments,
    reports,
    dailyChallenges,
    adminCredentialHash: null,
  };
}

class HubStore {
  private data: StoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as StoreData;
        if (parsed && parsed.users && Array.isArray(parsed.games)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load hub store, reinitializing:', err);
    }
    const fresh = createInitialStore();
    this.saveData(fresh);
    return fresh;
  }

  private saveData(data: StoreData) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${STORE_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmp, STORE_PATH);
    } catch (err) {
      console.error('Failed to persist store:', err);
    }
  }

  public save() {
    this.saveData(this.data);
  }

  public getState(): StoreData {
    return this.data;
  }

  public isUsernameAvailable(username: string): boolean {
    return !this.data.usernameIndex[username.trim().toLowerCase()];
  }

  public getUserById(id: string): UserProfile | null {
    return this.data.users[id] || null;
  }

  public getUserByUsername(username: string): UserProfile | null {
    const id = this.data.usernameIndex[username.trim().toLowerCase()];
    return id ? this.data.users[id] || null : null;
  }

  public createUser(params: {
    username: string;
    avatarId: string;
    ageGroup: EligibleAgeGroup;
    assuranceMethod: string;
  }): UserProfile {
    const id = `usr-${crypto.randomUUID()}`;
    const num = 2000 + Object.keys(this.data.users).length * 73 + Math.floor(Math.random() * 50);
    const playerId = `UZG-${num}`;
    const now = new Date().toISOString();

    const user: UserProfile = {
      id,
      playerId,
      username: params.username.trim(),
      avatarId: params.avatarId,
      ageGroup: params.ageGroup,
      ageVerified: true,
      assuranceMethod: params.assuranceMethod,
      role: 'player',
      level: 1,
      xp: 100,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      rank: computeRankTier(100),
      achievements: [
        {
          id: 'ach-welcome',
          title: 'Ilk Qadam',
          description: 'UZBEK GAMING HUB profili yaratildi va yosh tasdiqlandi.',
          tier: 'bronze',
          unlockedAt: now,
        },
      ],
      favoriteGames: [],
      matchHistory: [],
      dailyClaimedIds: [],
      joinedAt: now,
      status: 'active',
    };

    this.data.users[id] = user;
    this.data.usernameIndex[user.username.toLowerCase()] = id;
    this.save();
    return user;
  }

  public recordMatchOrGame(
    userId: string,
    record: Omit<MatchRecord, 'id' | 'playedAt'>
  ): UserProfile | null {
    const user = this.data.users[userId];
    if (!user) return null;

    const fullRecord: MatchRecord = {
      ...record,
      id: `m-${crypto.randomBytes(5).toString('hex')}`,
      playedAt: new Date().toISOString(),
    };

    user.totalMatches += 1;
    if (record.result === 'G‘alaba') user.wins += 1;
    if (record.result === 'Mag‘lubiyat') user.losses += 1;

    user.xp += Math.max(0, record.xpEarned);
    user.level = computeLevel(user.xp);
    user.rank = computeRankTier(user.xp);
    user.matchHistory = [fullRecord, ...user.matchHistory].slice(0, 30);

    this.evaluateAchievements(user);
    this.save();
    return user;
  }

  private evaluateAchievements(user: UserProfile) {
    const has = (id: string) => user.achievements.some((a) => a.id === id);
    const now = new Date().toISOString();

    if (user.totalMatches >= 1 && !has('ach-first-match')) {
      user.achievements.push({
        id: 'ach-first-match',
        title: 'Birinchi Jang',
        description: 'Platformadagi ilk o‘yin yoki arena bellashuvini yakunladingiz.',
        tier: 'bronze',
        unlockedAt: now,
      });
    }
    if (user.wins >= 5 && !has('ach-5-wins')) {
      user.achievements.push({
        id: 'ach-5-wins',
        title: 'G‘alabalar Seriyasi',
        description: '5 ta g‘alaba natijasiga erishdingiz.',
        tier: 'silver',
        unlockedAt: now,
      });
    }
    if (user.xp >= 1000 && !has('ach-gold-tier')) {
      user.achievements.push({
        id: 'ach-gold-tier',
        title: 'Oltin Daraja',
        description: '1000+ XP jamg‘arib Gold ligasiga kirdingiz.',
        tier: 'gold',
        unlockedAt: now,
      });
    }
    if (user.xp >= 3000 && !has('ach-diamond')) {
      user.achievements.push({
        id: 'ach-diamond',
        title: 'Kiber Elita',
        description: '3000+ XP bilan Diamond darajasiga yetdingiz.',
        tier: 'diamond',
        unlockedAt: now,
      });
    }
  }

  public getLeaderboard(ageGroup?: string): LeaderboardEntry[] {
    return Object.values(this.data.users)
      .filter((u) => u.status !== 'suspended')
      .filter((u) => !ageGroup || ageGroup === 'Barchasi' || u.ageGroup === ageGroup)
      .map((u) => ({
        playerId: u.playerId,
        username: u.username,
        avatarId: u.avatarId,
        ageGroup: u.ageGroup,
        level: u.level,
        xp: u.xp,
        wins: u.wins,
        losses: u.losses,
        totalMatches: u.totalMatches,
        rank: u.rank,
      }))
      .sort((a, b) => b.xp - a.xp || b.wins - a.wins);
  }
}

export const hubStore = new HubStore();
