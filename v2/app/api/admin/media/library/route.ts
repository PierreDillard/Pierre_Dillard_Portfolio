import { NextRequest, NextResponse } from 'next/server';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { ContentStorageError, readStoredContent, remoteContentEnabled } from '@/lib/contentStorage';
import { existingMediaTicket, listLibraryMedia, missingMedia } from '@/lib/mediaLibrary';
import { deleteUnusedMedia, MediaDeletionError } from '@/lib/mediaDeletion';
import { MediaUploadError } from '@/lib/mediaUploadPolicy';
import { verifyStoredMedia } from '@/lib/mediaUploadStorage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  return NextResponse.json({ error: (error instanceof MediaUploadError || error instanceof ContentStorageError) ? error.message : 'Médiathèque indisponible. Réessaie sans publier.', ...(error instanceof MediaDeletionError ? { deletion: error.deletion } : {}) }, { status: missingMedia(error) ? 404 : (error instanceof MediaUploadError || error instanceof ContentStorageError) ? error.status : 503, headers });
}
export async function GET(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request))) return new Response('Not found', { status: 404, headers });
  try { const { document } = await readStoredContent(); return NextResponse.json(await listLibraryMedia(request.nextUrl.searchParams.get('cursor') ?? undefined, document.retiredMedia), { headers }); }
  catch (error) { return failure(error); }
}
async function readLibraryRequest(request: NextRequest) {
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
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new MediaUploadError('Requête invalide.'); }
}
export async function POST(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404, headers });
  try { const body = await readLibraryRequest(request); return NextResponse.json(await verifyStoredMedia(await existingMediaTicket(body?.filename)), { headers }); }
  catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404, headers });
  try { const body = await readLibraryRequest(request); return NextResponse.json(await deleteUnusedMedia(body?.filename, body?.etag), { headers }); }
  catch (error) { return failure(error); }
}
