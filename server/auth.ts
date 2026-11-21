import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { hubStore } from './store.ts';
import { EligibleAgeGroup } from '../src/types/hub.ts';

// Runtime-ephemeral fallback if SESSION_SECRET is unset (never hardcoded)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export interface SessionPayload {
  userId: string;
  role: 'player' | 'admin';
  ageGroup: EligibleAgeGroup;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  auth?: SessionPayload;
}

function signHmac(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = signHmac(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = signHmac(body);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as SessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function createAssuranceToken(ageGroup: EligibleAgeGroup): string {
  const payload = {
    ageGroup,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 min
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${signHmac(body)}`;
}

export function verifyAssuranceToken(token: string, expectedAgeGroup: EligibleAgeGroup): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [body, sig] = parts;
    const expected = signHmac(body);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (parsed.exp < Math.floor(Date.now() / 1000)) return false;
    return parsed.ageGroup === expectedAgeGroup;
  } catch {
    return false;
  }
}

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  return derived.length === storedBuf.length && crypto.timingSafeEqual(derived, storedBuf);
}

export function verifyAdminPasscode(passcode: string): boolean {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const storedHash = hubStore.getState().adminCredentialHash;
  if (!storedHash) return false;
  return verifyPasscodeHash(passcode, storedHash);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi.' });
  }
  const token = header.slice(7).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan yoki yaroqsiz.' });
  }
  const user = hubStore.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'Foydalanuvchi topilmadi.' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Hisob vaqtincha bloklangan.' });
  }
  req.auth = payload;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator huquqi talab qilinadi.' });
  }
  next();
}

// Simple in-memory rate limiter for sensitive endpoints
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        error: 'Juda ko‘p so‘rov yuborildi. Biroz kutib qayta urinib ko‘ring.',
      });
    }
    bucket.count += 1;
    next();
  };
}
