import 'server-only';
import { randomUUID } from 'node:crypto';
import { get, head, put, del, BlobError, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { migrateSiteContent, siteContent, type SiteContent } from '@/content/site';
import { validateSiteContent } from '@/content/validate';

const documentPath = 'portfolio/content.json';
const snapshotPrefix = 'portfolio/versions/';
const maximumVersions = 50;
export interface ContentVersion { id: string; createdAt: string; action: string }
interface ContentSnapshot { schemaVersion: 1; updatedAt: string; draft: SiteContent; published: SiteContent }
export interface ContentDocument extends ContentSnapshot { versions: ContentVersion[] }
export interface StoredContent { document: ContentDocument; revision: string | null }
export class ContentStorageError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export function remoteContentEnabled() {
  const isContentPreview = process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'dev/portfolio-admin-online'
    && process.env.ADMIN_CONTENT_PREVIEW === 'true';
  const isContentProduction = process.env.VERCEL_ENV === 'production'
    && process.env.VERCEL_GIT_COMMIT_REF === 'master'
    && process.env.ADMIN_PRODUCTION_ENABLED === 'true'
    && Boolean(process.env.BLOB_STORE_ID);
  return isContentPreview || isContentProduction;
}
function validateSnapshot(value: unknown): asserts value is ContentSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Version invalide.');
  const snapshot = value as ContentSnapshot;
  if (snapshot.schemaVersion !== 1 || typeof snapshot.updatedAt !== 'string') throw new Error('Version invalide.');
  validateSiteContent(snapshot.draft); validateSiteContent(snapshot.published);
}
export async function readStoredContent(): Promise<StoredContent> {
  // The download can expose a weak HTTP ETag. Conditional writes require the
  // storage ETag from metadata, paired with the content read between two checks.
  let metadataBefore;
  try {
    metadataBefore = await head(documentPath);
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }
  if (!metadataBefore) {
    const initial = migrateSiteContent(siteContent);
    validateSiteContent(initial);
    return { document: { schemaVersion: 1, updatedAt: new Date().toISOString(), draft: initial, published: initial, versions: [] }, revision: null };
  }
  if (!metadataBefore.etag || metadataBefore.etag.startsWith('W/')) throw new ContentStorageError('Version du stockage indisponible. Réessaie sans publier.', 503);
  const response = await get(documentPath, { access: 'private', useCache: false });
  if (!response || response.statusCode !== 200) throw new ContentStorageError('Le contenu a changé pendant la lecture. Recharge avant de réessayer.', 409);
  const document: unknown = JSON.parse(await new Response(response.stream).text());
  const metadataAfter = await head(documentPath);
  if (metadataBefore.etag !== metadataAfter.etag) throw new ContentStorageError('Le contenu a changé pendant la lecture. Recharge avant de réessayer.', 409);
  validateSnapshot(document);
  const versions = (document as ContentDocument).versions;
  if (!Array.isArray(versions) || versions.length > maximumVersions || versions.some(version => !/^[a-f0-9-]{36}$/.test(version.id) || typeof version.createdAt !== 'string' || typeof version.action !== 'string')) throw new Error('Historique invalide.');
  return { document: document as ContentDocument, revision: metadataAfter.etag };
}
export async function changeStoredContent(action: 'save' | 'publish' | 'restore' | 'remove-version', revision: unknown, content?: unknown, versionId?: unknown): Promise<StoredContent> {
  if (!(revision === null || typeof revision === 'string')) throw new ContentStorageError('Révision manquante.', 400);
  if (action === 'save') validateSiteContent(content);
  const previous = await readStoredContent();
  if (previous.revision !== revision) {
    throw new ContentStorageError('Un autre onglet a enregistré. Exporte tes modifications avant de recharger.', 409);
  }
  if (previous.revision && Date.now() - Date.parse(previous.document.updatedAt) < 500) throw new ContentStorageError('Attends une seconde avant de réessayer.', 429);
  const next = structuredClone(previous.document);
  if (action === 'restore' || action === 'remove-version') {
    if (typeof versionId !== 'string' || !next.versions.some(version => version.id === versionId)) throw new ContentStorageError('Version inconnue.', 400);
  }
  if (action === 'remove-version') {
    next.versions = next.versions.filter(version => version.id !== versionId);
  } else {
    if (next.versions.length >= maximumVersions) throw new ContentStorageError('Historique plein (50 versions). Exporte et retire une version avant de sauvegarder.', 409);
    if (action === 'save') next.draft = content as SiteContent;
    if (action === 'publish') next.published = structuredClone(next.draft);
    if (action === 'restore') {
      const response = await get(`${snapshotPrefix}${versionId}.json`, { access: 'private', useCache: false });
      if (!response || response.statusCode !== 200) throw new Error('Version indisponible.');
      const snapshot: unknown = JSON.parse(await new Response(response.stream).text());
      validateSnapshot(snapshot);
      next.draft = snapshot.draft;
    }
    const id = randomUUID();
    const snapshot: ContentSnapshot = { schemaVersion: 1, updatedAt: previous.document.updatedAt, draft: previous.document.draft, published: previous.document.published };
    await put(`${snapshotPrefix}${id}.json`, JSON.stringify(snapshot), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
    next.versions.unshift({ id, createdAt: new Date().toISOString(), action });
  }
  next.updatedAt = new Date().toISOString();
  try {
    const result = await put(documentPath, JSON.stringify(next), { access: 'private', addRandomSuffix: false, contentType: 'application/json', ...(revision ? { ifMatch: revision } : { allowOverwrite: false }) });
    // Removing a history entry is explicit. A failed deletion leaves an unreferenced backup, never a false save failure.
    if (action === 'remove-version') await del(`${snapshotPrefix}${versionId}.json`).catch(() => undefined);
    return { document: next, revision: result.etag };
  } catch (error) {
    const conditionalConflict = error instanceof BlobPreconditionFailedError || (error instanceof BlobError && error.message === 'Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.');
    if (conditionalConflict) throw new ContentStorageError('Conflit : un autre onglet a enregistré. Tes modifications sont conservées.', 409);
    throw error;
  }
}

export async function readContentVersion(id: string) {
  const stored = await readStoredContent();
  if (!stored.document.versions.some(version => version.id === id)) throw new ContentStorageError('Version inconnue.', 404);
  const response = await get(`${snapshotPrefix}${id}.json`, { access: 'private', useCache: false });
  if (!response || response.statusCode !== 200) throw new Error('Version indisponible.');
  const snapshot: unknown = JSON.parse(await new Response(response.stream).text());
  validateSnapshot(snapshot);
  return snapshot;
}
