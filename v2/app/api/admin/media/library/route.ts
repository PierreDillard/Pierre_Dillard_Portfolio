import { NextRequest, NextResponse } from 'next/server';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { remoteContentEnabled } from '@/lib/contentStorage';
import { existingMediaTicket, listLibraryMedia, missingMedia } from '@/lib/mediaLibrary';
import { MediaUploadError } from '@/lib/mediaUploadPolicy';
import { verifyStoredMedia } from '@/lib/mediaUploadStorage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof MediaUploadError ? error.message : 'Médiathèque indisponible. Réessaie sans publier.' }, { status: missingMedia(error) ? 404 : error instanceof MediaUploadError ? error.status : 503, headers });
}
export async function GET(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request))) return new Response('Not found', { status: 404, headers });
  try { return NextResponse.json(await listLibraryMedia(request.nextUrl.searchParams.get('cursor') ?? undefined), { headers }); }
  catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404, headers });
  try {
    // This action only accepts one UUID filename, never file bytes or a remote URL.
    const reader = request.body?.getReader();
    if (!reader) throw new MediaUploadError('Fichier manquant.');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 1024) throw new MediaUploadError('Requête trop grande.', 413);
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new MediaUploadError('Requête invalide.'); }
    return NextResponse.json(await verifyStoredMedia(await existingMediaTicket(body?.filename)), { headers });
  } catch (error) { return failure(error); }
}
