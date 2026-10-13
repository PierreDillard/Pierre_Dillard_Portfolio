import { draftMode } from 'next/headers';
import { NextRequest } from 'next/server';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { remoteContentEnabled } from '@/lib/contentStorage';
export async function POST(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  const mode = await draftMode();
  if (request.nextUrl.searchParams.get('exit') === 'true') mode.disable(); else mode.enable();
  return new Response(null, { status: 303, headers: { Location: request.nextUrl.searchParams.get('exit') === 'true' ? '/admin' : '/', 'Cache-Control': 'private, no-store' } });
}
