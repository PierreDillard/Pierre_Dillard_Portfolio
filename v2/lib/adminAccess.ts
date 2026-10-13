import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { localAdminAllowed } from './localAdmin';
import { remoteContentEnabled } from './contentStorage';

export function adminAuthenticationConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && /^\d+$/.test(process.env.ADMIN_GITHUB_ID ?? ''));
}

export function adminAuthenticationEnabled() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAuthenticationPreview = process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'dev/portfolio-admin-online'
    && process.env.ADMIN_AUTH_PREVIEW === 'true';
  return (isDevelopment || isAuthenticationPreview) && adminAuthenticationConfigured();
}

export function adminModeEnabled() {
  if (remoteContentEnabled()) return adminAuthenticationEnabled() && Boolean(process.env.BLOB_STORE_ID);
  if (process.env.NODE_ENV !== 'development') return false;
  return process.env.ADMIN_REQUIRE_AUTH !== 'true' || adminAuthenticationConfigured();
}

export async function adminAccessAllowed(request: NextRequest, write = false) {
  if (!adminModeEnabled()) return false;
  if (remoteContentEnabled()) {
    let expectedOrigin: string;
    try { expectedOrigin = new URL(process.env.AUTH_URL ?? '').origin; } catch { return false; }
    if (expectedOrigin !== request.nextUrl.origin) return false;
    if (write && request.headers.get('origin') !== expectedOrigin) return false;
    const session = await auth();
    return session?.user?.id === process.env.ADMIN_GITHUB_ID;
  }
  if (!localAdminAllowed(request, write)) return false;
  if (!remoteContentEnabled() && process.env.ADMIN_REQUIRE_AUTH !== 'true') return true;
  const session = await auth();
  return session?.user?.id === process.env.ADMIN_GITHUB_ID;
}

export async function adminPageAllowed() {
  if (!adminModeEnabled()) return false;
  if (!remoteContentEnabled() && process.env.ADMIN_REQUIRE_AUTH !== 'true') return true;
  const session = await auth();
  return session?.user?.id === process.env.ADMIN_GITHUB_ID;
}
