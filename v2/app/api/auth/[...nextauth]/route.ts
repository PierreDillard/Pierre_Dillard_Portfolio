import { handlers } from '@/auth';
import { adminAuthenticationConfigured } from '@/lib/adminAccess';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || !adminAuthenticationConfigured()) return new Response('Not found', { status: 404 });
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || !adminAuthenticationConfigured()) return new Response('Not found', { status: 404 });
  return handlers.POST(request);
}
