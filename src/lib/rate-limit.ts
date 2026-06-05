type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  store.set(identifier, { ...entry, count: entry.count + 1 });
  return true;
}

export function portalUploadLimiter(ip: string): boolean {
  return rateLimit(`portal-upload:${ip}`, 20, 60 * 60 * 1000);
}

export function authLimiter(ip: string): boolean {
  return rateLimit(`auth:${ip}`, 10, 15 * 60 * 1000);
}

export function apiLimiter(ip: string): boolean {
  return rateLimit(`api:${ip}`, 100, 60 * 1000);
}
