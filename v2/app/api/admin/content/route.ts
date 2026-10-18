import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { validateSiteContent } from '@/content/validate';
import { migrateSiteContent } from '@/content/site';
import { MediaUploadError } from '@/lib/mediaUploadPolicy';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { remoteContentEnabled, readContentVersion, readStoredContent, changeStoredContent, ContentStorageError } from '@/lib/contentStorage';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store' };
function storageFailure(error: unknown) {
  return NextResponse.json({ error: (error instanceof ContentStorageError || error instanceof MediaUploadError) ? error.message : 'Stockage indisponible. Tes modifications restent dans l’éditeur ; reconnecte-toi ou réessaie.' }, { status: (error instanceof ContentStorageError || error instanceof MediaUploadError) ? error.status : 503, headers: privateHeaders });
}

const contentPath = path.join(process.cwd(), 'content', 'site.json');
const backupPath = path.join(process.cwd(), 'content', 'backups');

export async function GET(request: NextRequest) {
  if (!(await adminAccessAllowed(request))) return new Response('Not found', { status: 404 });
  if (remoteContentEnabled()) {
    try {
      const versionId = request.nextUrl.searchParams.get('versionId');
      if (versionId) return NextResponse.json(await readContentVersion(versionId), { headers: privateHeaders });
      const stored = await readStoredContent();
      if (request.nextUrl.searchParams.get('export') === 'true') return NextResponse.json(stored, { headers: privateHeaders });
      return NextResponse.json({ content: stored.document.draft, revision: stored.revision, versions: stored.document.versions }, { headers: privateHeaders }); } catch (error) { return storageFailure(error); }
  }
  return NextResponse.json(migrateSiteContent(JSON.parse(await readFile(contentPath, 'utf8'))), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  if (!(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 1_000_000) return NextResponse.json({ error: 'Le contenu dépasse 1 Mo.' }, { status: 413 });
    const content: unknown = JSON.parse(rawBody);
    if (remoteContentEnabled()) {
      const body = content as { content?: unknown; revision?: unknown };
      try { validateSiteContent(body.content); } catch { return NextResponse.json({ error: 'Contenu invalide.' }, { status: 400, headers: privateHeaders }); }
      const stored = await changeStoredContent('save', body.revision, body.content);
      return NextResponse.json({ ok: true, revision: stored.revision, versions: stored.document.versions }, { headers: privateHeaders });
    }
    validateSiteContent(content);
    await mkdir(backupPath, { recursive: true });
    const previous = await readFile(contentPath, 'utf8');
    const backupName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
    await writeFile(path.join(backupPath, backupName), previous, { flag: 'wx' });
    const temporaryPath = `${contentPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, contentPath);
    return NextResponse.json({ ok: true, backup: backupName });
  } catch (error) {
    if (remoteContentEnabled()) return storageFailure(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Enregistrement impossible.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!remoteContentEnabled() || !(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return NextResponse.json({ error: 'Requête trop grande.' }, { status: 413, headers: privateHeaders });
    const body = JSON.parse(rawBody) as { action?: unknown; revision?: unknown; versionId?: unknown };
    if (!['publish', 'restore', 'remove-version'].includes(String(body.action))) return NextResponse.json({ error: 'Action inconnue.' }, { status: 400, headers: privateHeaders });
    const stored = await changeStoredContent(body.action as 'publish' | 'restore' | 'remove-version', body.revision, undefined, body.versionId);
    return NextResponse.json({ ok: true, content: stored.document.draft, revision: stored.revision, versions: stored.document.versions }, { headers: privateHeaders });
  } catch (error) { return storageFailure(error); }
}
