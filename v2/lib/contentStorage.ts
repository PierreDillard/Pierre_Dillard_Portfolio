import { referencesMedia, validMediaFilename, quarantinePrefix } from './mediaSources';
import { MediaUploadError, mediaUploadPreviewEnabled } from './mediaUploadPolicy';
import 'server-only';
import { assertVerifiedMediaReferences } from './mediaLibrary';
import { randomUUID } from 'node:crypto';
import { get, head, put, del, BlobError, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { migrateSiteContent, siteContent, type SiteContent } from '@/content/site';
import { validateSiteContent } from '@/content/validate';

const documentPath = 'portfolio/content.json';
const snapshotPrefix = 'portfolio/versions/';
const maximumVersions = 50;
export interface ContentVersion { id: string; createdAt: string; action: string }
interface ContentSnapshot { schemaVersion: 1; updatedAt: string; draft: SiteContent; published: SiteContent }
export interface ContentDocument extends ContentSnapshot { versions: ContentVersion[]; retiredMedia?: string[] }
export interface StoredContent { document: ContentDocument; revision: string | null }
export class ContentStorageError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export function remoteContentEnabled() {
  const isContentPreview = process.env.VERCEL_ENV === 'preview'
    && (process.env.VERCEL_GIT_COMMIT_REF === 'dev/portfolio-admin-online' || mediaUploadPreviewEnabled())
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
  const retired = (document as ContentDocument).retiredMedia;
  if (retired !== undefined && (!Array.isArray(retired) || retired.length > 1000 || new Set(retired).size !== retired.length || retired.some(filename => !validMediaFilename(filename)))) throw new Error('Registre de suppression invalide.');
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
  if (action === 'save') { assertMediaNotRetired(content as SiteContent, previous.document); await assertVerifiedMediaReferences(content as SiteContent); }
  const next = structuredClone(previous.document);
  if (action === 'restore' || action === 'remove-version') {
    if (typeof versionId !== 'string' || !next.versions.some(version => version.id === versionId)) throw new ContentStorageError('Version inconnue.', 400);
  }
  if (action === 'remove-version') {
    next.versions = next.versions.filter(version => version.id !== versionId);
  } else {
    if (next.versions.length >= maximumVersions) throw new ContentStorageError('Historique plein (50 versions). Exporte et retire une version avant de sauvegarder.', 409);
    if (action === 'save') next.draft = content as SiteContent;
    if (action === 'publish') { assertMediaNotRetired(next.draft, next); await assertVerifiedMediaReferences(next.draft); next.published = structuredClone(next.draft); }
    if (action === 'restore') {
      const response = await get(`${snapshotPrefix}${versionId}.json`, { access: 'private', useCache: false });
      if (!response || response.statusCode !== 200) throw new Error('Version indisponible.');
      const snapshot: unknown = JSON.parse(await new Response(response.stream).text());
      validateSnapshot(snapshot);
      assertMediaNotRetired(snapshot.draft, next);
      await assertVerifiedMediaReferences(snapshot.draft);
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

function assertMediaNotRetired(content: SiteContent, document: ContentDocument) {
  if (document.retiredMedia?.some(filename => referencesMedia(content, filename))) throw new ContentStorageError('Un fichier sélectionné a été supprimé ou est en cours de suppression. Choisis un autre fichier avant de sauvegarder.', 409);
}
export async function assertStoredMediaNotRetired(pathname: string) {
  const filename = pathname.startsWith(quarantinePrefix) ? pathname.slice(quarantinePrefix.length) : '';
  if (!validMediaFilename(filename)) throw new MediaUploadError('Destination invalide.');
  const { document } = await readStoredContent();
  if (document.retiredMedia?.includes(filename)) throw new MediaUploadError('Ce fichier est supprimé ou en cours de suppression. Importe un nouveau fichier.', 409);
}
// Reserve deletion in the same CAS document as content saves. A concurrent save
// either wins before reservation (and blocks it), or loses its old revision.
export async function retireStoredMedia(filename: string) {
  if (!validMediaFilename(filename)) throw new ContentStorageError('Fichier inconnu.', 404);
  const previous = await readStoredContent();
  if (referencesMedia(previous.document.draft, filename)) throw new ContentStorageError('Ce fichier est utilisé dans le brouillon. Retire-le du contenu et enregistre avant de réessayer.', 409);
  if (referencesMedia(previous.document.published, filename)) throw new ContentStorageError('Ce fichier est utilisé par le contenu publié. Publie une version qui ne l’utilise plus avant de réessayer.', 409);
  const abortSignal = AbortSignal.timeout(30_000);
  for (let offset = 0; offset < previous.document.versions.length; offset += 5) {
    await Promise.all(previous.document.versions.slice(offset, offset + 5).map(async version => {
      const response = await get(`${snapshotPrefix}${version.id}.json`, { access: 'private', useCache: false, abortSignal });
      if (!response || response.statusCode !== 200) throw new ContentStorageError('Historique indisponible : le fichier est conservé. Réessaie plus tard.', 503);
      const snapshot: unknown = JSON.parse(await new Response(response.stream).text());
      validateSnapshot(snapshot);
      if (referencesMedia(snapshot.draft, filename) || referencesMedia(snapshot.published, filename)) throw new ContentStorageError(`Ce fichier est conservé dans la version du ${version.createdAt}. Exporte puis retire cette version de l’historique avant de supprimer le fichier.`, 409);
    }));
  }
  if (previous.document.retiredMedia?.includes(filename)) return { previousRevision: previous.revision, revision: previous.revision };
  if ((previous.document.retiredMedia?.length ?? 0) >= 1000) throw new ContentStorageError('Le registre de suppression est plein (1000 fichiers). Une maintenance est nécessaire avant de supprimer d’autres fichiers.', 409);
  const next: ContentDocument = { ...previous.document, retiredMedia: [...previous.document.retiredMedia ?? [], filename], updatedAt: new Date().toISOString() };
  try {
    const result = await put(documentPath, JSON.stringify(next), { access: 'private', addRandomSuffix: false, contentType: 'application/json', ...(previous.revision ? { ifMatch: previous.revision } : { allowOverwrite: false }) });
    return { previousRevision: previous.revision, revision: result.etag };
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || error instanceof BlobError && error.message === 'Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.') throw new ContentStorageError('Le contenu a changé pendant le contrôle. Le fichier est conservé ; réessaie.', 409);
    throw error;
  }
}
