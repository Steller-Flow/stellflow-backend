import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

interface RateLimitStore {
  hits: Map<string, { count: number; resetTime: number }>;
  failures: Map<string, { count: number; lockedUntil: number }>;
}

const store: RateLimitStore = {
  hits: new Map(),
  failures: new Map(),
};

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

function getOrCreateFailure(key: string) {
  let failure = store.failures.get(key);
  if (!failure || Date.now() > failure.lockedUntil) {
    failure = { count: 0, lockedUntil: 0 };
    store.failures.set(key, failure);
  }
  return failure;
}

export function recordFailedAttempt(key: string): { locked: boolean; attemptsRemaining: number } {
  const failure = getOrCreateFailure(key);
  failure.count += 1;

  if (failure.count >= LOCKOUT_THRESHOLD) {
    failure.lockedUntil = Date.now() + LOCKOUT_DURATION;
    return { locked: true, attemptsRemaining: 0 };
  }

  return { locked: false, attemptsRemaining: LOCKOUT_THRESHOLD - failure.count };
}

export function resetFailedAttempts(key: string): void {
  store.failures.delete(key);
}

export function isLockedOut(key: string): boolean {
  const failure = store.failures.get(key);
  if (!failure) return false;
  if (Date.now() > failure.lockedUntil) {
    store.failures.delete(key);
    return false;
  }
  return true;
}

export function getRemainingLockoutTime(key: string): number {
  const failure = store.failures.get(key);
  if (!failure) return 0;
  return Math.max(0, failure.lockedUntil - Date.now());
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? "unknown",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many authentication attempts, please try again later" },
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? "unknown",
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts, account temporarily locked" },
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const email = req.body?.email as string | undefined;
    return email ? `${ip}:${email}` : ip;
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many API requests, please try again later" },
  keyGenerator: (req) => {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    return userId ?? (req.ip ?? req.socket.remoteAddress ?? "unknown");
  },
});

export function lockoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  const email = req.body?.email as string | undefined;
  const key = email ? `${ip}:${email}` : ip;

  if (isLockedOut(key)) {
    const remainingMs = getRemainingLockoutTime(key);
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    res.status(429).json({
      success: false,
      error: `Account temporarily locked. Try again in ${remainingMinutes} minute(s)`,
    });
    return;
  }

  next();
}
