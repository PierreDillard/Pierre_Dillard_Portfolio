import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const mediaTypes: Record<string, string> = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/avif': '.avif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'application/pdf': '.pdf',
};
const maximumVerificationBytes = 32 * 1024 * 1024;
const ticketLifetime = 10 * 60 * 1000;
export interface MediaUploadTicket { pathname: string; contentType: string; size: number; validUntil: number }
export class MediaUploadError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export function mediaUploadPreviewEnabled() {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'dev/portfolio-media'
    && process.env.ADMIN_MEDIA_PREVIEW === 'true';
}
export function mediaUploadMaximumBytes() {
  const maximum = Number(process.env.MEDIA_UPLOAD_MAX_BYTES);
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > maximumVerificationBytes) {
    throw new MediaUploadError('Import indisponible : limite de stockage à configurer (32 Mio maximum pour cette étape).', 503);
  }
  return maximum;
}
function ticketSignature(payload: string) {
  if (!process.env.AUTH_SECRET || !process.env.BLOB_STORE_ID) throw new MediaUploadError('Configuration des imports incomplète.', 503);
  return createHmac('sha256', process.env.AUTH_SECRET).update(`portfolio-media:${process.env.BLOB_STORE_ID}:${payload}`).digest();
}
export function prepareMediaUpload(metadata: { name?: unknown; contentType?: unknown; size?: unknown }) {
  const { name, contentType, size } = metadata;
  const maximum = mediaUploadMaximumBytes();
  if (typeof name !== 'string' || name.length < 1 || name.length > 180 || /[\\/\x00-\x1f\x7f]/.test(name)) throw new MediaUploadError('Nom de fichier invalide.');
  if (typeof contentType !== 'string' || !Object.hasOwn(mediaTypes, contentType)) throw new MediaUploadError('Format autorisé : PNG, JPEG, WebP, AVIF, MP4, WebM ou PDF.');
  if (!Number.isSafeInteger(size) || Number(size) < 1) throw new MediaUploadError('Fichier vide ou taille invalide.');
  if (Number(size) > maximum) throw new MediaUploadError('Le fichier dépasse la limite configurée.', 413);
  const ticket: MediaUploadTicket = { pathname: `portfolio/media/quarantine/${randomUUID()}${mediaTypes[contentType]}`, contentType, size: Number(size), validUntil: Date.now() + ticketLifetime };
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return { ...ticket, ticket: `${payload}.${ticketSignature(payload).toString('base64url')}` };
}
export function readMediaUploadTicket(value: unknown): MediaUploadTicket {
  if (typeof value !== 'string' || value.length > 2048) throw new MediaUploadError('Autorisation d’import invalide.');
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra !== undefined) throw new MediaUploadError('Autorisation d’import invalide.');
  const expected = ticketSignature(payload);
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new MediaUploadError('Autorisation d’import invalide.');
  let ticket: MediaUploadTicket;
  try { ticket = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw new MediaUploadError('Autorisation d’import invalide.'); }
  if (!ticket || typeof ticket !== 'object' || !/^portfolio\/media\/quarantine\/[a-f0-9-]{36}\.(png|jpg|webp|avif|mp4|webm|pdf)$/.test(ticket.pathname)
    || !Object.hasOwn(mediaTypes, ticket.contentType) || !ticket.pathname.endsWith(mediaTypes[ticket.contentType])
    || !Number.isSafeInteger(ticket.size) || ticket.size < 1 || ticket.size > mediaUploadMaximumBytes()
    || !Number.isSafeInteger(ticket.validUntil) || ticket.validUntil <= Date.now() || ticket.validUntil > Date.now() + ticketLifetime) {
    throw new MediaUploadError('Autorisation d’import expirée ou invalide. Relance l’import.');
  }
  return ticket;
}
export function mediaSignatureMatches(bytes: Buffer, contentType: string) {
  if (contentType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (contentType === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (contentType === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (contentType === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  if (contentType === 'application/pdf') return bytes.toString('ascii', 0, 5) === '%PDF-';
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
  const boxSize = bytes.readUInt32BE(0);
  if (boxSize < 16 || boxSize > bytes.length || boxSize % 4 !== 0) return false;
  const brands = [bytes.toString('ascii', 8, 12)];
  for (let offset = 16; offset < boxSize; offset += 4) brands.push(bytes.toString('ascii', offset, offset + 4));
  const isAvif = brands.includes('avif') || brands.includes('avis');
  if (contentType === 'image/avif') return isAvif;
  return contentType === 'video/mp4' && !isAvif && brands.some(brand => ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(brand));
}
