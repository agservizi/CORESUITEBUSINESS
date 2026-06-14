const buckets = new Map<string, { count: number; resetAt: number }>();

const MAX_PER_MINUTE = 40;

export function checkAiRateLimit(userId: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + 60_000 });
    return { ok: true };
  }
  if (bucket.count >= MAX_PER_MINUTE) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}
