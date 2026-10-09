import { NextResponse } from 'next/server';
import { createDemoSessionToken, DEMO_COOKIE_NAME, demoCookieMaxAge } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(DEMO_COOKIE_NAME, createDemoSessionToken(), {
      httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: demoCookieMaxAge,
    });
    return response;
  } catch (error) {
    console.error('Demo session configuration error:', error);
    return NextResponse.json({ error: 'Demo session is not configured' }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DEMO_COOKIE_NAME, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return response;
}
