export type AgeGroup = '13-15' | '16-17' | '18-24' | '25-34' | '35+';
export type EligibleAgeGroup = '16-17' | '18-24' | '25-34' | '35+';

export type RankTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master';

export type GameEngineType =
  | 'racer3d'
  | 'maze3d'
  | 'orb3d'
  | 'stacker3d'
  | 'defense3d'
  | 'chess'
  | 'sudoku'
  | 'wordsearch'
  | 'memory'
  | 'reflex'
  | 'circuit'
  | 'empire';

export type ArenaMapId =
  | 'cyber_city'
  | 'desert_arena'
  | 'industrial_zone'
  | 'night_city'
  | 'futuristic_base';

export interface GameConfig {
  accentHex: string;
  secondaryHex: string;
  speedMultiplier?: number;
  gridSize?: number;
  targetScore?: number;
  timeLimitSec?: number;
  aiDepth?: number;
  wordList?: string[];
  themeLabel?: string;
}

export interface GameItem {
  id: string;
  title: string;
  description: string;
  ageGroup: EligibleAgeGroup;
  category: string;
  difficulty: 'Oson' | 'O‘rta' | 'Qiyin' | 'Ekspert';
  mode: 'Yakka' | 'Ko‘p o‘yinchili' | '1v1 Arena';
  engine: GameEngineType;
  engineConfig: GameConfig;
  instructions: string;
  coverUrl?: string;
  featured: boolean;
  popular: boolean;
  isNew: boolean;
  multiplayer: boolean;
  playersCount: number;
  xpReward: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlockedAt: string;
}

export interface MatchRecord {
  id: string;
  arenaMap: ArenaMapId;
  mode: '1v1 Online' | 'Mashq (Demo Bot)' | 'O‘yin';
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  result: 'G‘alaba' | 'Mag‘lubiyat' | 'Durang';
  xpEarned: number;
  playedAt: string;
}

export interface UserProfile {
  id: string;
  playerId: string;
  username: string;
  avatarId: string;
  ageGroup: EligibleAgeGroup;
  ageVerified: boolean;
  assuranceMethod: string;
  role: 'player' | 'admin';
  level: number;
  xp: number;
  totalMatches: number;
  wins: number;
  losses: number;
  rank: RankTier;
  achievements: AchievementBadge[];
  favoriteGames: string[];
  matchHistory: MatchRecord[];
  dailyClaimedIds: string[];
  joinedAt: string;
  status: 'active' | 'muted' | 'suspended';
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  avatarId: string;
  ageGroup: EligibleAgeGroup;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  totalMatches: number;
  rank: RankTier;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  targetCount: number;
  category: string;
}

export interface TournamentItem {
  id: string;
  title: string;
  arenaMap: ArenaMapId;
  ageGroup: EligibleAgeGroup | 'Barchasi';
  prizeXp: number;
  maxPlayers: number;
  participants: string[];
  status: 'Ro‘yxatdan o‘tish' | 'Faol' | 'Yakunlangan';
  startsAt: string;
}

export interface ModerationReport {
  id: string;
  reporterUsername: string;
  targetUsername: string;
  reason: string;
  details: string;
  status: 'Kutilmoqda' | 'Ko‘rib chiqildi' | 'Rad etildi';
  createdAt: string;
}
