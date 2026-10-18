import 'server-only';
import { createHash } from 'node:crypto';
import { get, head } from '@vercel/blob';
import { MediaUploadError, mediaSignatureMatches, readMediaUploadTicket } from './mediaUploadPolicy';

// Quarantine objects are never exposed or attached to content in E1.
export async function verifyMediaUpload(authorization: unknown) {
  const ticket = readMediaUploadTicket(authorization);
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
  return { pathname: ticket.pathname, size, contentType: ticket.contentType, sha256: hash.digest('hex') };
}
