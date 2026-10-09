import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const DEMO_COOKIE_NAME = 'chainguard_demo_token';
export const DEMO_USER_ID = 'demo-judge-hungyen-2026';
const DEMO_TTL_SECONDS = 12 * 60 * 60;

export interface AuthenticatedUser {
  uid: string;
  isDemo: boolean;
}

function getDemoSecret(): string {
  const secret = process.env.DEMO_SESSION_SECRET || process.env.GEMINI_API_KEY;
  if (!secret && process.env.NODE_ENV !== 'production') return 'chainguard-local-demo-session-secret-change-me';
  if (!secret || secret.length < 32) throw new Error('DEMO_SESSION_SECRET must contain at least 32 characters');
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getDemoSecret()).update(value).digest('base64url');
}

export function createDemoSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + DEMO_TTL_SECONDS;
  const payload = `${DEMO_USER_ID}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyDemoSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [uid, expiresText, signature] = parts;
  const expiresAt = Number(expiresText);
  if (uid !== DEMO_USER_ID || !Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000) return false;
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(`${uid}.${expiresText}`));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json() as { users?: Array<{ localId?: string }> };
  return data.users?.[0]?.localId || null;
}

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get('cookie');
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return undefined;
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const uid = await verifyFirebaseIdToken(authorization.slice(7));
    if (uid) return { uid, isDemo: false };
  }
  try {
    if (verifyDemoSessionToken(readCookie(request, DEMO_COOKIE_NAME))) return { uid: DEMO_USER_ID, isDemo: true };
  } catch {
    return null;
  }
  return null;
}

export const demoCookieMaxAge = DEMO_TTL_SECONDS;
