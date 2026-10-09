import 'server-only';

interface Bucket { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number }
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limits: { perMinute: number; perDay: number }) {
  const now = Date.now();
  const minuteMs = 60_000;
  const dayMs = 86_400_000;
  const bucket = buckets.get(key) || { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  if (now - bucket.minuteStart >= minuteMs) { bucket.minuteStart = now; bucket.minuteCount = 0; }
  if (now - bucket.dayStart >= dayMs) { bucket.dayStart = now; bucket.dayCount = 0; }
  if (bucket.minuteCount >= limits.perMinute) return { allowed: false, retryAfter: Math.ceil((minuteMs - (now - bucket.minuteStart)) / 1000) };
  if (bucket.dayCount >= limits.perDay) return { allowed: false, retryAfter: Math.ceil((dayMs - (now - bucket.dayStart)) / 1000) };
  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  buckets.set(key, bucket);
  return { allowed: true, retryAfter: 0 };
}
