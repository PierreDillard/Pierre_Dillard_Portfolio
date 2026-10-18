import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';

let clock = Date.now();
class TestDate extends Date {
  constructor(...values) { super(...(values.length ? values : [clock])); }
  static now() { return clock; }
}
function loadModule(filename, imports) {
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code} })`, { process, Buffer, Date: TestDate, AbortSignal, Response, Headers, URL, structuredClone })(name => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports;
}
Object.assign(process.env, { MEDIA_UPLOAD_MAX_BYTES: '8388608', VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'master', ADMIN_PRODUCTION_ENABLED: 'true', BLOB_STORE_ID: 'synthetic-deletion-store' });
class BlobError extends Error {}
class BlobNotFoundError extends BlobError {}
class BlobPreconditionFailedError extends BlobError {}
const objects = new Map();
const deleted = [];
let sequence = 0;
let failDocumentWrite = false;
let failRawDeletion = false;
let failCleanup = false;
let changeBeforeDelete = false;
let beforeWrite;
const documentPath = 'portfolio/content.json';
const sdk = {
  BlobError, BlobNotFoundError, BlobPreconditionFailedError,
  async head(pathname) {
    const entry = objects.get(pathname); if (!entry) throw new BlobNotFoundError();
    return { pathname, etag: entry.etag, size: entry.body.length, contentType: entry.contentType };
  },
  async get(pathname) {
    const entry = objects.get(pathname); if (!entry) return null;
    return { statusCode: 200, stream: new Response(entry.body).body, blob: { size: entry.body.length } };
  },
  async put(pathname, body, options) {
    assert.equal(options.access, 'private');
    if (beforeWrite) await beforeWrite(pathname, JSON.parse(body));
    if (failDocumentWrite && pathname === documentPath) throw new BlobError('Document write failed');
    const current = objects.get(pathname);
    if (options.ifMatch ? current?.etag !== options.ifMatch : current && !options.allowOverwrite) throw new BlobPreconditionFailedError();
    const etag = `revision-${++sequence}`;
    objects.set(pathname, { body: Buffer.from(body), etag, contentType: options.contentType });
    return { etag };
  },
  async list(options) {
    return { blobs: [...objects.entries()].filter(([pathname]) => pathname.startsWith(options.prefix)).map(([pathname, entry]) => ({ pathname, etag: entry.etag, size: entry.body.length })), hasMore: false };
  },
  async del(pathname, options = {}) {
    const current = objects.get(pathname);
    if (pathname.startsWith('portfolio/media/quarantine/')) {
      if (failRawDeletion) throw new BlobError('Raw delete failed');
      assert.ok(options.ifMatch, 'Raw deletion must be conditional');
      if (changeBeforeDelete) { current.etag = 'changed-during-delete'; changeBeforeDelete = false; }
      if (current?.etag !== options.ifMatch) throw new BlobPreconditionFailedError();
    }
    if (failCleanup && pathname.startsWith('portfolio/media/verified/')) throw new BlobError('Cleanup failed');
    objects.delete(pathname); deleted.push(pathname);
  },
};
const initial = JSON.parse(readFileSync('content/site.json', 'utf8'));
const sources = loadModule('lib/mediaSources.ts', {});
const policy = loadModule('lib/mediaUploadPolicy.ts', { 'node:crypto': crypto });
const validation = loadModule('content/validate.ts', {});
const library = loadModule('lib/mediaLibrary.ts', { 'server-only': {}, '@vercel/blob': sdk, './mediaSources': sources, './mediaUploadPolicy': policy });
const storage = loadModule('lib/contentStorage.ts', { 'server-only': {}, 'node:crypto': crypto, '@vercel/blob': sdk, './mediaSources': sources, './mediaLibrary': library, './mediaUploadPolicy': policy, '@/content/site': { siteContent: initial, migrateSiteContent: value => value }, '@/content/validate': validation });
const deletion = loadModule('lib/mediaDeletion.ts', { 'server-only': {}, '@vercel/blob': sdk, './mediaSources': sources, './mediaUploadPolicy': policy, './contentStorage': storage });
const uploads = loadModule('lib/mediaUploadStorage.ts', { 'server-only': {}, 'node:crypto': crypto, '@vercel/blob': sdk, './contentStorage': storage, './mediaLibrary': library, './mediaUploadPolicy': policy });
const filename = `${crypto.randomUUID()}.png`;
const rawPath = sources.quarantinePrefix + filename;
const verificationPath = sources.verifiedMediaPrefix + filename + '.json';
const src = sources.storedMediaPrefix + filename;
const bytes = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(20)]);
function assignDocument(document) {
  objects.set(documentPath, { body: Buffer.from(JSON.stringify(document)), etag: `revision-${++sequence}`, contentType: 'application/json' });
}
function currentDocument() { return JSON.parse(objects.get(documentPath).body.toString()); }
function seed() {
  clock += 1000; objects.clear(); deleted.length = 0;
  failDocumentWrite = false; failRawDeletion = false; failCleanup = false; changeBeforeDelete = false; beforeWrite = undefined;
  assignDocument({ schemaVersion: 1, updatedAt: new TestDate(clock - 1000).toISOString(), draft: structuredClone(initial), published: structuredClone(initial), versions: [] });
  objects.set(rawPath, { body: bytes, etag: 'raw-original', contentType: 'image/png' });
  objects.set(verificationPath, { body: Buffer.from(JSON.stringify({ pathname: rawPath, src, etag: 'raw-original', size: bytes.length, contentType: 'image/png', sha256: crypto.createHash('sha256').update(bytes).digest('hex') })), etag: 'record-original', contentType: 'application/json' });
}
seed();
let result = await deletion.deleteUnusedMedia(filename, 'raw-original');
assert.equal(result.removed, true); assert.equal(result.cleanupPending, false);
assert.notEqual(result.revision, result.previousRevision);
assert.equal(objects.has(rawPath), false); assert.equal(objects.has(verificationPath), false);
assert.deepEqual(currentDocument().retiredMedia, [filename]);
assert.equal(currentDocument().versions.length, 0, 'Retirement does not create a misleading editorial history entry');
await assert.rejects(storage.assertStoredMediaNotRetired(rawPath), error => error.status === 409);
clock += 1000;
const unavailableContent = structuredClone(initial); unavailableContent.profile.portraitSrc = src;
await assert.rejects(storage.changeStoredContent('save', result.revision, unavailableContent), error => error.status === 409);
assert.equal((await deletion.deleteUnusedMedia(filename, 'raw-original')).removed, true, 'Retry cleanup after an interrupted response');

for (const location of ['draft', 'published', 'hidden-project', 'retained-draft', 'retained-published', 'raw-url']) {
  seed(); const document = currentDocument();
  if (location === 'draft' || location === 'published') document[location].profile.portraitSrc = src;
  if (location === 'hidden-project') { document.published.projects[0].visibility = 'draft'; document.published.projects[0].media[0].src = src; }
  if (location === 'raw-url') document.draft.profile.portraitSrc = `https://private.example/${rawPath}`;
  if (location.startsWith('retained')) {
    const id = crypto.randomUUID();
    const snapshot = { schemaVersion: 1, updatedAt: document.updatedAt, draft: structuredClone(initial), published: structuredClone(initial) };
    snapshot[location === 'retained-draft' ? 'draft' : 'published'].profile.portraitSrc = src;
    document.versions = [{ id, createdAt: document.updatedAt, action: 'save' }];
    objects.set(`portfolio/versions/${id}.json`, { body: Buffer.from(JSON.stringify(snapshot)), etag: 'snapshot', contentType: 'application/json' });
  }
  assignDocument(document);
  await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 409, location);
  assert.equal(objects.has(rawPath), true); assert.equal(currentDocument().retiredMedia, undefined); assert.equal(deleted.length, 0);
}
seed();
let document = currentDocument(); document.versions = [{ id: crypto.randomUUID(), createdAt: document.updatedAt, action: 'save' }]; assignDocument(document);
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 503);
assert.equal(objects.has(rawPath), true); assert.equal(currentDocument().retiredMedia, undefined);
seed(); failDocumentWrite = true;
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'));
assert.equal(objects.has(rawPath), true); assert.equal(deleted.length, 0);
seed();
await assert.rejects(deletion.deleteUnusedMedia(filename, 'outdated-etag'), error => error.status === 409);
assert.equal(currentDocument().retiredMedia, undefined);
seed(); failRawDeletion = true;
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 503 && error.deletion.removed === false && Boolean(error.deletion.revision));
assert.equal(objects.has(rawPath), true); assert.deepEqual(currentDocument().retiredMedia, [filename]);
await assert.rejects(uploads.verifyStoredMedia({ pathname: rawPath, contentType: 'image/png', size: bytes.length, validUntil: clock + 10000 }), error => error.status === 409);
failRawDeletion = false;
assert.equal((await deletion.deleteUnusedMedia(filename, 'raw-original')).removed, true);
seed(); changeBeforeDelete = true;
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 409 && error.deletion.removed === false);
assert.equal(objects.has(rawPath), true);
assert.equal((await deletion.deleteUnusedMedia(filename, 'changed-during-delete')).removed, true);
seed(); failCleanup = true;
result = await deletion.deleteUnusedMedia(filename, 'raw-original');
assert.equal(result.removed, true); assert.equal(result.cleanupPending, true);
assert.equal(objects.has(rawPath), false); assert.equal(objects.has(verificationPath), true);
failCleanup = false;
assert.equal((await deletion.deleteUnusedMedia(filename, 'raw-original')).cleanupPending, false);
seed(); objects.delete(verificationPath);
assert.equal((await deletion.deleteUnusedMedia(filename, 'raw-original')).cleanupPending, false, 'An unverified E1 file has no metadata to clean');
seed();
await assert.rejects(deletion.deleteUnusedMedia('../content.json', 'raw-original'), error => error.status === 400);
await assert.rejects(deletion.deleteUnusedMedia(`${crypto.randomUUID()}.png`, 'unknown'), error => error.status === 404);
assert.equal(currentDocument().retiredMedia, undefined);
seed(); document = currentDocument(); document.retiredMedia = Array.from({ length: 1000 }, () => crypto.randomUUID() + '.png'); assignDocument(document);
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 409);
assert.equal(objects.has(rawPath), true);

// A verification callback cannot re-enable a filename retired during its metadata write.
seed(); beforeWrite = async path => {
  if (path === verificationPath) { beforeWrite = undefined; await storage.retireStoredMedia(filename); }
};
await assert.rejects(uploads.verifyStoredMedia({ pathname: rawPath, contentType: 'image/png', size: bytes.length, validUntil: clock + 10000 }), error => error.status === 409);
assert.equal((await library.listLibraryMedia(undefined, currentDocument().retiredMedia)).items[0].verified, false);

// A content save wins first: the deletion's original revision must fail without deleting.
seed(); beforeWrite = async (path, next) => {
  if (path === documentPath && next.retiredMedia?.includes(filename)) {
    beforeWrite = undefined; const winner = currentDocument(); winner.draft.profile.portraitSrc = src; assignDocument(winner);
  }
};
await assert.rejects(deletion.deleteUnusedMedia(filename, 'raw-original'), error => error.status === 409);
assert.equal(objects.has(rawPath), true); assert.equal(currentDocument().draft.profile.portraitSrc, src); assert.equal(currentDocument().retiredMedia, undefined);

// Deletion wins while a validated save is paused before CAS: the save cannot attach the deleted object.
seed(); let enteredResolve; let resumeResolve;
const entered = new Promise(resolve => { enteredResolve = resolve; });
const resume = new Promise(resolve => { resumeResolve = resolve; });
beforeWrite = async (path, next) => {
  if (path === documentPath && next.draft.profile.portraitSrc === src) { beforeWrite = undefined; enteredResolve(); await resume; }
};
const revision = objects.get(documentPath).etag;
const nextContent = structuredClone(initial); nextContent.profile.portraitSrc = src;
const saving = storage.changeStoredContent('save', revision, nextContent);
await entered;
await deletion.deleteUnusedMedia(filename, 'raw-original');
resumeResolve();
await assert.rejects(saving, error => error.status === 409);
assert.equal(objects.has(rawPath), false); assert.notEqual(currentDocument().draft.profile.portraitSrc, src);

let owner = false;
const access = { adminAccessAllowed: async (request, write = false) => owner && (!write || request.headers.get('origin') === request.nextUrl.origin) };
const api = loadModule('app/api/admin/media/library/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/adminAccess': access, '@/lib/contentStorage': storage, '@/lib/mediaLibrary': library, '@/lib/mediaUploadPolicy': policy, '@/lib/mediaDeletion': deletion, '@/lib/mediaUploadStorage': { verifyStoredMedia: async () => { throw new Error('Unexpected verification'); } } });
function request(body, origin = 'https://portfolio.example') {
  const value = new Request('https://portfolio.example/api/admin/media/library', { method: 'DELETE', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }); value.nextUrl = new URL(value.url); return value;
}
seed();
assert.equal((await api.DELETE(request({ filename, etag: 'raw-original' }))).status, 404);
owner = true;
assert.equal((await api.DELETE(request({ filename, etag: 'raw-original' }, 'https://foreign.example'))).status, 404);
assert.equal((await api.DELETE(request('x'.repeat(1025)))).status, 413);
assert.equal(objects.has(rawPath), true);
let response = await api.DELETE(request({ filename, etag: 'raw-original' }));
assert.equal(response.status, 200); assert.equal((await response.json()).removed, true);
seed(); failRawDeletion = true;
response = await api.DELETE(request({ filename, etag: 'raw-original' }));
assert.equal(response.status, 503); assert.equal((await response.json()).deletion.removed, false);
console.log('[media-deletion] passed: draft/published/hidden/history/raw-URL reference protection, missing-history/write-failure denial, conditional object deletion, retry, partial cleanup, size/path/owner/origin guards and bounded retirement registry.');
console.log('[media-deletion] passed deterministic CAS races: concurrent reference save wins => file retained; retirement wins => stale save refused.');
console.log('[media-deletion] synthetic storage only. NO real production file deleted; real conditional Blob delete, UI confirmation and concurrency still require live validation.');
