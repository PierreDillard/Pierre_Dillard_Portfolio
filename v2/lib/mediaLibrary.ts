import 'server-only';
import { BlobNotFoundError, get, head, list, put } from '@vercel/blob';
import type { SiteContent } from '@/content/site';
import { MediaUploadError, mediaTypes, mediaUploadMaximumBytes } from './mediaUploadPolicy';
import { collectMediaSources, isStoredMediaSource, mediaKind, quarantinePrefix, storedMediaPrefix, validMediaFilename, verifiedMediaPrefix } from './mediaSources';

export interface VerifiedMedia { pathname: string; size: number; contentType: string; sha256: string; etag: string; src: string }
export interface LibraryMedia { filename: string; src: string; size: number; kind: 'image' | 'video' | 'pdf'; verified: boolean; etag: string; retired: boolean }
export async function readVerifiedMedia(filename: string): Promise<VerifiedMedia | null> {
  if (!validMediaFilename(filename)) throw new MediaUploadError('Fichier inconnu.', 404);
  const response = await get(`${verifiedMediaPrefix}${filename}.json`, { access: 'private', useCache: false, abortSignal: AbortSignal.timeout(10_000) });
  if (!response) return null;
  if (response.statusCode !== 200 || response.blob.size > 4096) { if (response.stream) await response.stream.cancel(); throw new MediaUploadError('Vérification du média indisponible.', 503); }
  const record = JSON.parse(await new Response(response.stream).text()) as VerifiedMedia;
  if (!record || record.pathname !== `${quarantinePrefix}${filename}` || record.src !== `${storedMediaPrefix}${filename}`
    || !Number.isSafeInteger(record.size) || record.size < 1 || record.size > 32 * 1024 * 1024
    || typeof record.etag !== 'string' || !record.etag || !/^[a-f0-9]{64}$/.test(record.sha256)
    || !Object.hasOwn(mediaTypes, record.contentType) || !filename.endsWith(mediaTypes[record.contentType])) throw new MediaUploadError('Vérification du média invalide.', 503);
  return record;
}
export async function recordVerifiedMedia(record: Omit<VerifiedMedia, 'src'>) {
  const filename = record.pathname.slice(quarantinePrefix.length);
  if (!validMediaFilename(filename) || record.pathname !== `${quarantinePrefix}${filename}`) throw new MediaUploadError('Destination invalide.');
  const verified: VerifiedMedia = { ...record, src: `${storedMediaPrefix}${filename}` };
  await put(`${verifiedMediaPrefix}${filename}.json`, JSON.stringify(verified), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, abortSignal: AbortSignal.timeout(10_000) });
  return verified;
}
export async function listLibraryMedia(cursor?: string, retiredMedia: readonly string[] = []) {
  if (cursor && cursor.length > 1024) throw new MediaUploadError('Page de médias invalide.');
  const page = await list({ prefix: quarantinePrefix, limit: 24, cursor, abortSignal: AbortSignal.timeout(15_000) });
  const items = await Promise.all(page.blobs.filter(blob => validMediaFilename(blob.pathname.slice(quarantinePrefix.length))).map(async blob => {
    const filename = blob.pathname.slice(quarantinePrefix.length);
    const record = await readVerifiedMedia(filename);
    return { filename, src: `${storedMediaPrefix}${filename}`, size: blob.size, kind: mediaKind(filename), etag: blob.etag, retired: retiredMedia.includes(filename), verified: Boolean(!retiredMedia.includes(filename) && record && record.etag === blob.etag && record.size === blob.size) } satisfies LibraryMedia;
  }));
  return { items, cursor: page.hasMore ? page.cursor : undefined };
}
export async function existingMediaTicket(filename: unknown) {
  if (!validMediaFilename(filename)) throw new MediaUploadError('Fichier inconnu.', 404);
  const pathname = `${quarantinePrefix}${filename}`;
  const metadata = await head(pathname, { abortSignal: AbortSignal.timeout(10_000) });
  if (!Object.hasOwn(mediaTypes, metadata.contentType) || !filename.endsWith(mediaTypes[metadata.contentType]) || metadata.size < 1 || metadata.size > mediaUploadMaximumBytes()) throw new MediaUploadError('Format ou taille du fichier non autorisé.');
  return { pathname, contentType: metadata.contentType, size: metadata.size, validUntil: Date.now() + 60_000 };
}
export async function assertVerifiedMediaReferences(content: SiteContent) {
  const sources = collectMediaSources(content).filter(source => source.startsWith(storedMediaPrefix));
  if (sources.length > 200) throw new MediaUploadError('Le contenu dépasse 200 références de médias distants.');
  for (const source of sources) {
    if (!isStoredMediaSource(source)) throw new MediaUploadError('Référence de média invalide.');
    const record = await readVerifiedMedia(source.slice(storedMediaPrefix.length));
    if (!record) throw new MediaUploadError('Un média doit être vérifié dans la médiathèque avant son enregistrement.');
    const metadata = await head(record.pathname, { abortSignal: AbortSignal.timeout(10_000) });
    if (metadata.etag !== record.etag || metadata.size !== record.size || metadata.contentType !== record.contentType) throw new MediaUploadError('Un média a changé. Vérifie-le dans la médiathèque avant de sauvegarder.', 409);
  }
}
export function missingMedia(error: unknown) { return error instanceof BlobNotFoundError || error instanceof MediaUploadError && error.status === 404; }
