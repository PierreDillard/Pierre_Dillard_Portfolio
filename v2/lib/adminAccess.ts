import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { localAdminAllowed } from './localAdmin';

export function adminAuthenticationConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && /^\d+$/.test(process.env.ADMIN_GITHUB_ID ?? ''));
}

export function adminModeEnabled() {
  if (process.env.NODE_ENV !== 'development') return false;
  return process.env.ADMIN_REQUIRE_AUTH !== 'true' || adminAuthenticationConfigured();
}

export async function adminAccessAllowed(request: NextRequest, write = false) {
  if (!adminModeEnabled() || !localAdminAllowed(request, write)) return false;
  if (process.env.ADMIN_REQUIRE_AUTH !== 'true') return true;
  const session = await auth();
  return session?.user?.id === process.env.ADMIN_GITHUB_ID;
}

export async function adminPageAllowed() {
  if (!adminModeEnabled()) return false;
  if (process.env.ADMIN_REQUIRE_AUTH !== 'true') return true;
  const session = await auth();
  return session?.user?.id === process.env.ADMIN_GITHUB_ID;
}
