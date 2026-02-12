import { Request, Response, NextFunction } from 'express';

/**
 * In-memory sliding-window rate limiter.
 *
 * Each IP is tracked with a list of request timestamps. When the
 * window slides forward, old entries are pruned.
 *
 * For production at scale, swap the Map for a Redis-backed store
 * (e.g. `rate-limit-redis`).  For this project it's sufficient.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60 000 = 1 min) */
  windowMs?: number;
  /** Max requests allowed in the window (default: 60) */
  max?: number;
  /** Message returned when limit is exceeded */
  message?: string;
}

const stores: Map<string, Map<string, RateLimitEntry>> = new Map();

export function rateLimiter(opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 60;
  const message = opts.message ?? 'Too many requests, please try again later.';

  // Each call to rateLimiter() creates its own store so you can
  // apply different limits to different route groups.
  const store: Map<string, RateLimitEntry> = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Prune timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ message });
    }

    entry.timestamps.push(now);

    // Set standard rate-limit headers
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(max - entry.timestamps.length));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

    next();
  };
}

/* Pre-built presets */

/** General API: 100 req / min */
export const apiLimiter = rateLimiter({ windowMs: 60_000, max: 100 });

/** Auth routes: 15 req / 15 min (brute-force protection) */
export const authLimiter = rateLimiter({
  windowMs: 15 * 60_000,
  max: 15,
  message: 'Too many login attempts, please try again in 15 minutes.',
});

/** AI-heavy routes: 30 req / min (LLM calls are expensive) */
export const aiLimiter = rateLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'AI service rate limit reached. Please wait a moment.',
});
