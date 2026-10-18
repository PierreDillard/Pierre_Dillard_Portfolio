import 'server-only';
import { BlobNotFoundError, BlobPreconditionFailedError, del, head } from '@vercel/blob';
import { readStoredContent, retireStoredMedia } from './contentStorage';
import { MediaUploadError } from './mediaUploadPolicy';
import { quarantinePrefix, storedMediaPrefix, validMediaFilename, verifiedMediaPrefix } from './mediaSources';

export interface MediaDeletionResult { src: string; previousRevision: string | null; revision: string | null; removed: boolean; cleanupPending: boolean }
export class MediaDeletionError extends MediaUploadError {
  constructor(message: string, status: number, public readonly deletion: MediaDeletionResult) { super(message, status); }
}
export async function deleteUnusedMedia(filename: unknown, expectedEtag: unknown): Promise<MediaDeletionResult> {
  if (!validMediaFilename(filename) || typeof expectedEtag !== 'string' || !expectedEtag || expectedEtag.length > 256) throw new MediaUploadError('Fichier ou version invalide.');
  const pathname = `${quarantinePrefix}${filename}`;
  let metadata;
  try { metadata = await head(pathname, { abortSignal: AbortSignal.timeout(10_000) }); }
  catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
    const { document } = await readStoredContent();
    if (!document.retiredMedia?.includes(filename)) throw new MediaUploadError('Fichier inconnu.', 404);
  }
  if (metadata && metadata.etag !== expectedEtag) throw new MediaUploadError('Le fichier a changé. Actualise la médiathèque avant de le supprimer.', 409);
  const revisions = await retireStoredMedia(filename);
  const result: MediaDeletionResult = { ...revisions, src: `${storedMediaPrefix}${filename}`, removed: false, cleanupPending: false };
  if (metadata) {
    try { await del(pathname, { ifMatch: metadata.etag, abortSignal: AbortSignal.timeout(15_000) }); }
    catch (error) {
      throw new MediaDeletionError(error instanceof BlobPreconditionFailedError ? 'Le fichier a changé pendant sa suppression. Actualise puis réessaie.' : 'Suppression incomplète. Le fichier reste bloqué à la sélection ; réessaie pour terminer.', error instanceof BlobPreconditionFailedError ? 409 : 503, result);
    }
  }
  result.removed = true;
  try {
    const verificationPath = `${verifiedMediaPrefix}${filename}.json`;
    const verification = await head(verificationPath, { abortSignal: AbortSignal.timeout(10_000) });
    await del(verificationPath, { ifMatch: verification.etag, abortSignal: AbortSignal.timeout(10_000) });
  } catch (error) { if (!(error instanceof BlobNotFoundError)) result.cleanupPending = true; }
  return result;
}
