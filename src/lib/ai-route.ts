import 'server-only';

import { authenticateRequest } from '@/lib/server-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function protectAiRoute(request: Request, route: string, perMinute: number, perDay: number) {
  const user = await authenticateRequest(request);
  if (!user) return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  const rate = checkRateLimit(`${route}:${user.uid}`, { perMinute, perDay });
  if (!rate.allowed) return { response: Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }) };
  return { user };
}

export function validateImageInput(value: unknown): { imageBase64: string; mimeType: string } {
  if (!value || typeof value !== 'object') throw new Error('Invalid image request');
  const { imageBase64, mimeType } = value as Record<string, unknown>;
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (typeof mimeType !== 'string' || !allowed.has(mimeType)) throw new Error('Unsupported image type');
  if (typeof imageBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) throw new Error('Invalid image data');
  if (Buffer.byteLength(imageBase64, 'base64') > 8 * 1024 * 1024) throw new Error('Image exceeds the 8MB limit');
  return { imageBase64, mimeType };
}
