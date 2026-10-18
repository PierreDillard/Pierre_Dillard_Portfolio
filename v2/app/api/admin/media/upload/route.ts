import { NextRequest, NextResponse } from 'next/server';
import { BlobError, issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned, type HandleUploadPresignedBody } from '@vercel/blob/client';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { remoteContentEnabled } from '@/lib/contentStorage';
import { MediaUploadError, mediaTypes, mediaUploadMaximumBytes, mediaUploadEnabled, prepareMediaUpload, readMediaUploadTicket } from '@/lib/mediaUploadPolicy';
import { verifyMediaUpload } from '@/lib/mediaUploadStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const privateHeaders = { 'Cache-Control': 'private, no-store' };
const maximumRequestBytes = 8192;
function importsEnabled() { return remoteContentEnabled() && mediaUploadEnabled(); }
function failure(error: unknown) {
  if (error instanceof BlobError && ['Vercel Blob: Missing callback signature', 'Vercel Blob: Invalid callback signature'].includes(error.message)) {
    return NextResponse.json({ error: 'Signature de notification invalide.' }, { status: 403, headers: privateHeaders });
  }
  return NextResponse.json({ error: error instanceof MediaUploadError ? error.message : 'Import ou vérification indisponible. Réessaie après avoir vérifié la connexion et le stockage.' }, { status: error instanceof MediaUploadError ? error.status : 503, headers: privateHeaders });
}
async function readUploadRequest(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.body) throw new MediaUploadError('Requête manquante.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumRequestBytes) throw new MediaUploadError('Requête trop grande.', 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new MediaUploadError('Requête invalide.'); }
}
export async function GET(request: NextRequest) {
  if (!importsEnabled() || !(await adminAccessAllowed(request))) return new Response('Not found', { status: 404 });
  try {
    if (!process.env.BLOB_WEBHOOK_PUBLIC_KEY) throw new MediaUploadError('Configuration des imports incomplète.', 503);
    return NextResponse.json({ maximumSizeInBytes: mediaUploadMaximumBytes(), contentTypes: Object.keys(mediaTypes) }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!importsEnabled()) return new Response('Not found', { status: 404 });
  // Provider callbacks have no browser session; only the SDK's Ed25519 verification authorizes them.
  const isCallback = Boolean(request.headers.get('x-vercel-signature'));
  if (!isCallback && !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  try {
    const body = await readUploadRequest(request);
    if (isCallback && body.type !== 'blob.upload-completed') throw new MediaUploadError('Notification invalide.');
    if (!isCallback && body.action === 'prepare') return NextResponse.json(prepareMediaUpload(body), { headers: privateHeaders });
    if (!isCallback && body.action === 'verify') return NextResponse.json(await verifyMediaUpload(body.ticket), { headers: privateHeaders });
    if (body.type !== (isCallback ? 'blob.upload-completed' : 'blob.generate-presigned-url') || !body.payload || typeof body.payload !== 'object') throw new MediaUploadError('Action inconnue.');
    if (isCallback && !/^[a-f0-9]{128}$/i.test(request.headers.get('x-vercel-signature') ?? '')) throw new MediaUploadError('Signature de notification invalide.');
    const result = await handleUploadPresigned({
      request, body: body as unknown as HandleUploadPresignedBody,
      getSignedToken: async (pathname, clientPayload, multipart) => {
        const ticket = readMediaUploadTicket(clientPayload);
        if (pathname !== ticket.pathname || multipart !== false) throw new MediaUploadError('Destination ou mode d’import invalide.');
        const token = await issueSignedToken({ pathname, operations: ['put'], abortSignal: AbortSignal.timeout(15_000), validUntil: ticket.validUntil, allowedContentTypes: [ticket.contentType], maximumSizeInBytes: ticket.size });
        return { token, urlOptions: { validUntil: ticket.validUntil, allowedContentTypes: [ticket.contentType], maximumSizeInBytes: ticket.size, addRandomSuffix: false, allowOverwrite: false, tokenPayload: clientPayload, callbackUrl: `${request.nextUrl.origin}/api/admin/media/upload` } };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const ticket = readMediaUploadTicket(tokenPayload);
        if (blob.pathname !== ticket.pathname || blob.contentType !== ticket.contentType) throw new MediaUploadError('Notification incompatible avec l’import.');
        await verifyMediaUpload(tokenPayload);
      },
    });
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
