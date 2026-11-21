import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { marketStore } from './marketStore.ts';

// Runtime-ephemeral fallback if SESSION_SECRET is unset (never hardcoded)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export interface AdminRequest extends Request {
  admin?: AdminSessionPayload;
}

function signHmac(data: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const full: AdminSessionPayload = {
    role: 'admin',
    iat: now,
    exp: now + 60 * 60 * 24 * 3, // 3 days
  };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  return `${body}.${signHmac(body)}`;
}

export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
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
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
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
    const a = crypto.createHash('sha256').update(passcode).digest();
    const b = crypto.createHash('sha256').update(envPasscode).digest();
    return crypto.timingSafeEqual(a, b);
  }
  const storedHash = marketStore.getState().adminCredentialHash;
  if (!storedHash) return false;
  return verifyPasscodeHash(passcode, storedHash);
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Administrator avtorizatsiyasi talab qilinadi.' });
  }
  const token = header.slice(7).trim();
  const payload = verifyAdminSessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sessiya muddati tugagan yoki yaroqsiz.' });
  }
  req.admin = payload;
  next();
}

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
