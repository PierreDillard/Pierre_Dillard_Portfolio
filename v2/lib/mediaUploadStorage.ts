import 'server-only';
import { createHash } from 'node:crypto';
import { get, head } from '@vercel/blob';
import { assertStoredMediaNotRetired } from './contentStorage';
import { recordVerifiedMedia } from './mediaLibrary';
import { MediaUploadError, mediaSignatureMatches, readMediaUploadTicket, type MediaUploadTicket } from './mediaUploadPolicy';

export async function verifyMediaUpload(authorization: unknown) {
  return verifyStoredMedia(readMediaUploadTicket(authorization));
}
// Existing uploads may be reverified by an owner without an expired browser ticket.
export async function verifyStoredMedia(ticket: MediaUploadTicket) {
  await assertStoredMediaNotRetired(ticket.pathname);
  const abortSignal = AbortSignal.timeout(30_000);
  const metadata = await head(ticket.pathname, { abortSignal });
  if (metadata.pathname !== ticket.pathname || metadata.size !== ticket.size || metadata.contentType !== ticket.contentType) {
    throw new MediaUploadError('Le fichier stocké ne correspond pas à l’import autorisé.');
  }
  const response = await get(ticket.pathname, { access: 'private', useCache: false, abortSignal });
  if (!response || response.statusCode !== 200) throw new MediaUploadError('Fichier indisponible pour vérification.', 503);
  const reader = response.stream.getReader();
  const hash = createHash('sha256');
  let size = 0;
  const chunks: Buffer[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > ticket.size) throw new MediaUploadError('La taille réelle dépasse la taille autorisée.', 413);
      const chunk = Buffer.from(value);
      chunks.push(chunk); hash.update(chunk);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  if (size !== ticket.size || !mediaSignatureMatches(Buffer.concat(chunks), ticket.contentType)) {
    throw new MediaUploadError('Le contenu du fichier ne correspond pas à son format ou sa taille.');
  }
  const after = await head(ticket.pathname, { abortSignal });
  if (after.etag !== metadata.etag) throw new MediaUploadError('Le fichier a changé pendant sa vérification.', 409);
  const record = await recordVerifiedMedia({ pathname: ticket.pathname, size, contentType: ticket.contentType, sha256: hash.digest('hex'), etag: metadata.etag });
  await assertStoredMediaNotRetired(ticket.pathname);
  return record;
}
