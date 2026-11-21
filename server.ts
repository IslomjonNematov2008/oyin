import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AuthRequest,
  createAssuranceToken,
  createSessionToken,
  hashPasscode,
  rateLimit,
  requireAdmin,
  requireAuth,
  verifyAdminPasscode,
  verifyAssuranceToken,
} from './server/auth.ts';
import { hubStore } from './server/store.ts';
import { setupMultiplayer } from './server/multiplayer.ts';
import { AgeGroup, EligibleAgeGroup, GameItem, TournamentItem } from './src/types/hub.ts';

const ELIGIBLE_AGES: EligibleAgeGroup[] = ['16-17', '18-24', '25-34', '35+'];
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '256kb' }));

  // Attach real-time Socket.IO 1v1 multiplayer engine
  setupMultiplayer(server);

  // ========================================================
  // PHASE 1: AGE VERIFICATION & PRIVACY-FIRST REGISTRATION
  // ========================================================
  app.post('/api/auth/age-check', rateLimit(40, 60_000), (req, res) => {
    const ageGroup = String(req.body?.ageGroup || '') as AgeGroup;
    if (ageGroup === '13-15') {
      return res.status(403).json({
        allowed: false,
        message: 'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.',
      });
    }
    if (!ELIGIBLE_AGES.includes(ageGroup as EligibleAgeGroup)) {
      return res.status(400).json({
        allowed: false,
        message: 'Iltimos, to‘g‘ri yosh toifasini tanlang.',
      });
    }
    return res.json({ allowed: true, ageGroup });
  });

  app.get('/api/auth/check-username', rateLimit(60, 60_000), (req, res) => {
    const username = String(req.query.username || '').trim();
    if (!USERNAME_REGEX.test(username)) {
      return res.json({
        valid: false,
        available: false,
        message: 'Foydalanuvchi nomi 3–20 belgi (harf, raqam, _) bo‘lishi kerak.',
      });
    }
    const available = hubStore.isUsernameAvailable(username);
    return res.json({
      valid: true,
      available,
      message: available
        ? 'Foydalanuvchi nomi bo‘sh va foydalanishga tayyor.'
        : 'Bu foydalanuvchi nomi allaqachon band qilingan.',
    });
  });

  // Privacy-first third-party age assurance simulation (zero PII/ID photos stored)
  app.post('/api/auth/age-assurance', rateLimit(20, 60_000), (req, res) => {
    const ageGroup = String(req.body?.ageGroup || '') as AgeGroup;
    const birthYear = Number(req.body?.birthYear);
    const consent = Boolean(req.body?.privacyConsent);

    if (ageGroup === '13-15') {
      return res.status(403).json({
        verified: false,
        message: 'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.',
      });
    }
    if (!ELIGIBLE_AGES.includes(ageGroup as EligibleAgeGroup)) {
      return res.status(400).json({ verified: false, message: 'Noto‘g‘ri yosh toifasi.' });
    }
    if (!consent) {
      return res.status(400).json({
        verified: false,
        message: 'Maxfiylik shartlariga rozilik tasdiqlanishi shart.',
      });
    }

    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(birthYear) || birthYear < 1930 || birthYear > currentYear - 5) {
      return res.status(400).json({
        verified: false,
        message: 'Tug‘ilgan yil noto‘g‘ri kiritildi.',
      });
    }

    const calculatedAge = currentYear - birthYear;
    if (calculatedAge < 16) {
      return res.status(403).json({
        verified: false,
        underageBlocked: true,
        message: 'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.',
      });
    }

    // Return ONLY non-PII eligibility assurance token
    const assuranceToken = createAssuranceToken(ageGroup as EligibleAgeGroup);
    return res.json({
      verified: true,
      provider: 'UzTrust Zero-Knowledge AgeGate',
      assuranceToken,
      eligible: true,
    });
  });

  app.post('/api/auth/register', rateLimit(15, 60_000), (req, res) => {
    const { ageGroup, username, avatarId, assuranceToken } = req.body || {};

    if (ageGroup === '13-15') {
      return res.status(403).json({
        error: 'Sizning yoshingiz ushbu platformadan foydalanish uchun yetarli emas.',
      });
    }
    if (!ELIGIBLE_AGES.includes(ageGroup)) {
      return res.status(400).json({ error: 'Yaroqsiz yosh toifasi.' });
    }
    const cleanName = String(username || '').trim();
    if (!USERNAME_REGEX.test(cleanName)) {
      return res.status(400).json({ error: 'Foydalanuvchi nomi talablarga javob bermaydi.' });
    }
    if (!hubStore.isUsernameAvailable(cleanName)) {
      return res.status(409).json({ error: 'Bu foydalanuvchi nomi allaqachon band.' });
    }
    if (!verifyAssuranceToken(String(assuranceToken || ''), ageGroup)) {
      return res.status(403).json({
        error: 'Yosh tasdiqlash tokeni yaroqsiz. Iltimos, 3-bosqichni qayta bajaring.',
      });
    }

    const user = hubStore.createUser({
      username: cleanName,
      avatarId: String(avatarId || 'cyber_helmet'),
      ageGroup,
      assuranceMethod: 'UzTrust Zero-Knowledge AgeGate',
    });

    const token = createSessionToken({
      userId: user.id,
      role: user.role,
      ageGroup: user.ageGroup,
    });

    return res.status(201).json({ user, token });
  });

  // ========================================================
  // USER PROFILE, GAMES, DAILY CHALLENGES, TOURNAMENTS
  // ========================================================
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    res.json({ user });
  });

  app.get('/api/hub/bootstrap', requireAuth, (req: AuthRequest, res) => {
    const state = hubStore.getState();
    const user = hubStore.getUserById(req.auth!.userId);
    res.json({
      user,
      games: state.games,
      tournaments: state.tournaments,
      dailyChallenges: state.dailyChallenges,
      leaderboard: hubStore.getLeaderboard(),
    });
  });

  app.get('/api/games', (req, res) => {
    const ageGroup = req.query.ageGroup ? String(req.query.ageGroup) : undefined;
    const games = hubStore.getState().games;
    const filtered =
      ageGroup && ageGroup !== 'Barchasi'
        ? games.filter((g) => g.ageGroup === ageGroup)
        : games;
    res.json({ games: filtered });
  });

  app.post('/api/games/complete', requireAuth, rateLimit(30, 60_000), (req: AuthRequest, res) => {
    const { gameId, score, won } = req.body || {};
    const game = hubStore.getState().games.find((g) => g.id === gameId);
    if (!game) {
      return res.status(404).json({ error: 'O‘yin topilmadi.' });
    }
    const cleanScore = Math.max(0, Math.min(999999, Math.floor(Number(score) || 0)));
    const earned = won ? game.xpReward : Math.max(25, Math.floor(game.xpReward * 0.4));

    const updated = hubStore.recordMatchOrGame(req.auth!.userId, {
      arenaMap: 'cyber_city',
      mode: 'O‘yin',
      opponentName: game.title,
      playerScore: cleanScore,
      opponentScore: won ? 0 : 1,
      result: won ? 'G‘alaba' : 'Mag‘lubiyat',
      xpEarned: earned,
    });

    res.json({ user: updated, xpEarned: earned });
  });

  app.post('/api/arena/practice-complete', requireAuth, rateLimit(20, 60_000), (req: AuthRequest, res) => {
    const { arenaMap, playerScore, botScore, won } = req.body || {};
    const earned = won ? 90 : 35;
    const updated = hubStore.recordMatchOrGame(req.auth!.userId, {
      arenaMap: arenaMap || 'cyber_city',
      mode: 'Mashq (Demo Bot)',
      opponentName: 'Taktik Demo Bot',
      playerScore: Number(playerScore) || 0,
      opponentScore: Number(botScore) || 0,
      result: won ? 'G‘alaba' : 'Mag‘lubiyat',
      xpEarned: earned,
    });
    res.json({ user: updated, xpEarned: earned });
  });

  app.post('/api/profile/favorite', requireAuth, (req: AuthRequest, res) => {
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    const gameId = String(req.body?.gameId || '');
    const exists = user.favoriteGames.includes(gameId);
    user.favoriteGames = exists
      ? user.favoriteGames.filter((id) => id !== gameId)
      : [gameId, ...user.favoriteGames].slice(0, 20);
    hubStore.save();
    res.json({ user });
  });

  app.post('/api/challenges/claim', requireAuth, (req: AuthRequest, res) => {
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    const challengeId = String(req.body?.challengeId || '');
    const challenge = hubStore.getState().dailyChallenges.find((c) => c.id === challengeId);
    if (!challenge) return res.status(404).json({ error: 'Vazifa topilmadi.' });
    if (user.dailyClaimedIds.includes(challengeId)) {
      return res.status(400).json({ error: 'Ushbu mukofot allaqachon olingan.' });
    }
    user.dailyClaimedIds.push(challengeId);
    const updated = hubStore.recordMatchOrGame(user.id, {
      arenaMap: 'futuristic_base',
      mode: 'O‘yin',
      opponentName: `Kunlik vazifa: ${challenge.title}`,
      playerScore: 1,
      opponentScore: 0,
      result: 'G‘alaba',
      xpEarned: challenge.xpReward,
    });
    res.json({ user: updated });
  });

  app.post('/api/tournaments/join', requireAuth, (req: AuthRequest, res) => {
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    const tournamentId = String(req.body?.tournamentId || '');
    const trn = hubStore.getState().tournaments.find((t) => t.id === tournamentId);
    if (!trn) return res.status(404).json({ error: 'Turnir topilmadi.' });
    if (trn.participants.includes(user.username)) {
      return res.json({ tournaments: hubStore.getState().tournaments });
    }
    if (trn.participants.length >= trn.maxPlayers) {
      return res.status(400).json({ error: 'Turnir o‘rinlari to‘lgan.' });
    }
    trn.participants.push(user.username);
    hubStore.save();
    res.json({ tournaments: hubStore.getState().tournaments });
  });

  app.get('/api/leaderboard', (req, res) => {
    const ageGroup = req.query.ageGroup ? String(req.query.ageGroup) : undefined;
    res.json({ leaderboard: hubStore.getLeaderboard(ageGroup) });
  });

  app.post('/api/reports', requireAuth, rateLimit(10, 60_000), (req: AuthRequest, res) => {
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    const targetUsername = String(req.body?.targetUsername || '').trim().slice(0, 30);
    const reason = String(req.body?.reason || '').trim().slice(0, 80);
    const details = String(req.body?.details || '').trim().slice(0, 400);
    if (!targetUsername || !reason) {
      return res.status(400).json({ error: 'Shikoyat ma’lumotlari to‘liq emas.' });
    }
    hubStore.getState().reports.unshift({
      id: `rep-${Date.now()}`,
      reporterUsername: user.username,
      targetUsername,
      reason,
      details,
      status: 'Kutilmoqda',
      createdAt: new Date().toISOString(),
    });
    hubStore.save();
    res.status(201).json({ message: 'Shikoyat administratorga yuborildi.' });
  });

  // ========================================================
  // ADMIN RBAC & SECURE BOOTSTRAP / LOGIN
  // ========================================================
  app.get('/api/admin/status', requireAuth, (req: AuthRequest, res) => {
    const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
    const hasStoredHash = Boolean(hubStore.getState().adminCredentialHash);
    res.json({
      configured: hasEnvPasscode || hasStoredHash,
      isAdminSession: req.auth?.role === 'admin',
    });
  });

  app.post('/api/admin/bootstrap', requireAuth, rateLimit(5, 60_000), (req: AuthRequest, res) => {
    const hasEnvPasscode = Boolean((process.env.ADMIN_PASSCODE || '').trim());
    if (hasEnvPasscode || hubStore.getState().adminCredentialHash) {
      return res.status(403).json({
        error: 'Administrator paroli allaqachon o‘rnatilgan.',
      });
    }
    const passcode = String(req.body?.passcode || '').trim();
    if (passcode.length < 8) {
      return res.status(400).json({
        error: 'Administrator paroli kamida 8 ta belgidan iborat bo‘lishi kerak.',
      });
    }
    hubStore.getState().adminCredentialHash = hashPasscode(passcode);
    const user = hubStore.getUserById(req.auth!.userId);
    if (user) {
      user.role = 'admin';
    }
    hubStore.save();

    const token = createSessionToken({
      userId: req.auth!.userId,
      role: 'admin',
      ageGroup: req.auth!.ageGroup,
    });
    res.json({ user, token });
  });

  app.post('/api/admin/login', requireAuth, rateLimit(8, 60_000), (req: AuthRequest, res) => {
    const passcode = String(req.body?.passcode || '').trim();
    if (!verifyAdminPasscode(passcode)) {
      return res.status(401).json({ error: 'Administrator paroli noto‘g‘ri.' });
    }
    const user = hubStore.getUserById(req.auth!.userId);
    if (!user) return res.status(404).json({ error: 'Profil topilmadi.' });
    user.role = 'admin';
    hubStore.save();

    const token = createSessionToken({
      userId: user.id,
      role: 'admin',
      ageGroup: user.ageGroup,
    });
    res.json({ user, token });
  });

  app.get('/api/admin/overview', requireAuth, requireAdmin, (_req, res) => {
    const state = hubStore.getState();
    const users = Object.values(state.users).map((u) => ({
      id: u.id,
      playerId: u.playerId,
      username: u.username,
      ageGroup: u.ageGroup,
      ageVerified: u.ageVerified,
      role: u.role,
      level: u.level,
      xp: u.xp,
      wins: u.wins,
      losses: u.losses,
      totalMatches: u.totalMatches,
      rank: u.rank,
      status: u.status,
      joinedAt: u.joinedAt,
    }));
    res.json({
      users,
      games: state.games,
      tournaments: state.tournaments,
      reports: state.reports,
    });
  });

  app.post('/api/admin/games', requireAuth, requireAdmin, (req, res) => {
    const { title, description, ageGroup, category, difficulty, mode, engine, xpReward } =
      req.body || {};
    if (!title || !description || !ELIGIBLE_AGES.includes(ageGroup)) {
      return res.status(400).json({ error: 'O‘yin ma’lumotlari to‘liq emas.' });
    }
    const newGame: GameItem = {
      id: `custom-${Date.now()}`,
      title: String(title).trim().slice(0, 60),
      description: String(description).trim().slice(0, 300),
      ageGroup,
      category: String(category || '3D Kiber Arena'),
      difficulty: difficulty || 'O‘rta',
      mode: mode || 'Yakka',
      engine: engine || 'orb3d',
      engineConfig: {
        accentHex: '#FF6B00',
        secondaryHex: '#00D2FF',
        speedMultiplier: 1.1,
        targetScore: 15,
        themeLabel: 'Admin Qo‘shgan O‘yin',
      },
      instructions: 'Boshqaruv tugmalari yordamida vazifani bajaring.',
      featured: false,
      popular: false,
      isNew: true,
      multiplayer: mode === 'Ko‘p o‘yinchili',
      playersCount: 1,
      xpReward: Math.max(50, Math.min(500, Number(xpReward) || 120)),
    };
    hubStore.getState().games.unshift(newGame);
    hubStore.save();
    res.status(201).json({ game: newGame, games: hubStore.getState().games });
  });

  app.patch('/api/admin/games/:id', requireAuth, requireAdmin, (req, res) => {
    const game = hubStore.getState().games.find((g) => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: 'O‘yin topilmadi.' });
    if (req.body?.title) game.title = String(req.body.title).trim().slice(0, 60);
    if (req.body?.description) game.description = String(req.body.description).trim().slice(0, 300);
    if (req.body?.ageGroup && ELIGIBLE_AGES.includes(req.body.ageGroup)) {
      game.ageGroup = req.body.ageGroup;
    }
    hubStore.save();
    res.json({ game, games: hubStore.getState().games });
  });

  app.delete('/api/admin/games/:id', requireAuth, requireAdmin, (req, res) => {
    const state = hubStore.getState();
    state.games = state.games.filter((g) => g.id !== req.params.id);
    hubStore.save();
    res.json({ games: state.games });
  });

  app.post('/api/admin/tournaments', requireAuth, requireAdmin, (req, res) => {
    const { title, arenaMap, ageGroup, prizeXp, maxPlayers } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Turnir nomi kiritilmadi.' });
    const trn: TournamentItem = {
      id: `trn-${Date.now()}`,
      title: String(title).trim().slice(0, 80),
      arenaMap: arenaMap || 'cyber_city',
      ageGroup: ageGroup || 'Barchasi',
      prizeXp: Number(prizeXp) || 1000,
      maxPlayers: Number(maxPlayers) || 16,
      participants: [],
      status: 'Ro‘yxatdan o‘tish',
      startsAt: new Date(Date.now() + 86400_000 * 2).toISOString(),
    };
    hubStore.getState().tournaments.unshift(trn);
    hubStore.save();
    res.status(201).json({ tournaments: hubStore.getState().tournaments });
  });

  app.patch('/api/admin/reports/:id', requireAuth, requireAdmin, (req, res) => {
    const rep = hubStore.getState().reports.find((r) => r.id === req.params.id);
    if (!rep) return res.status(404).json({ error: 'Shikoyat topilmadi.' });
    if (req.body?.status) rep.status = req.body.status;
    hubStore.save();
    res.json({ reports: hubStore.getState().reports });
  });

  app.patch('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    const user = hubStore.getUserById(String(req.params.id));
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    if (['active', 'muted', 'suspended'].includes(req.body?.status)) {
      user.status = req.body.status;
    }
    hubStore.save();
    res.json({ user });
  });

  // ========================================================
  // VITE DEV / PRODUCTION STATIC SERVING ON PORT 3000
  // ========================================================
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`UZBEK GAMING HUB server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
