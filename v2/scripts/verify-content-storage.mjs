import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setTimeout } from 'node:timers/promises';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';

// Deterministic state-machine checks. The fake SDK is not proof of Vercel persistence.
const initial = JSON.parse(readFileSync('content/site.json', 'utf8'));
function loadModule(filename, imports) {
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code} })`, { process, Response, Date, structuredClone })(name => {
    if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}
const validation = loadModule('content/validate.ts', {});
validation.validateSiteContent(initial);
class BlobError extends Error {}
class BlobPreconditionFailedError extends BlobError {}
class BlobNotFoundError extends BlobError {}
const blobs = new Map();
let sequence = 0;
let rejectRead = false;
let rejectSnapshot = false;
let rejectDocument = false;
let changeRevisionDuringRead = false;
const blobSdk = {
  BlobError, BlobPreconditionFailedError, BlobNotFoundError,
  async head(pathname) {
    if (rejectRead) throw new Error('service unavailable');
    const entry = blobs.get(pathname);
    if (!entry) throw new BlobNotFoundError();
    return { etag: entry.etag };
  },
  async get(pathname) {
    if (rejectRead) throw new Error('service unavailable');
    const entry = blobs.get(pathname);
    const response = entry ? { statusCode: 200, stream: new Response(entry.body).body, blob: { etag: `W/${entry.etag}` } } : null;
    if (entry && changeRevisionDuringRead && pathname === 'portfolio/content.json') {
      entry.etag = `"revision-${++sequence}"`;
      changeRevisionDuringRead = false;
    }
    return response;
  },
  async put(pathname, body, options) {
    if (rejectDocument === 'conditional' && pathname.endsWith('/content.json')) throw new BlobPreconditionFailedError();
    if ((rejectSnapshot && pathname.includes('/versions/')) || (rejectDocument && pathname.endsWith('/content.json'))) throw new Error('service unavailable');
    assert.equal(options.access, 'private');
    const existing = blobs.get(pathname);
    if (options.ifMatch ? existing?.etag !== options.ifMatch : existing && !options.allowOverwrite) throw new BlobPreconditionFailedError();
    const etag = `"revision-${++sequence}"`;
    blobs.set(pathname, { body, etag });
    return { etag };
  },
  async del(pathname) { blobs.delete(pathname); },
};
const storage = loadModule('lib/contentStorage.ts', {
  'server-only': {}, 'node:crypto': { randomUUID }, '@vercel/blob': blobSdk,
  './mediaUploadPolicy': { mediaUploadPreviewEnabled: () => false },
  './mediaLibrary': { assertVerifiedMediaReferences: async () => undefined },
  '@/content/site': { siteContent: initial, migrateSiteContent: value => value }, '@/content/validate': validation,
});
const pauseWrites = () => setTimeout(510);
let state = await storage.readStoredContent();
assert.equal(state.revision, null);
const modified = structuredClone(initial);
modified.profile.heroLead += ' PRIVATE DRAFT MARKER';
state = await storage.changeStoredContent('save', null, modified);
assert.ok(state.document.draft.profile.heroLead.includes('PRIVATE DRAFT MARKER'));
assert.equal(state.document.published.profile.heroLead, initial.profile.heroLead);
await assert.rejects(storage.changeStoredContent('save', null, initial), error => error.status === 409);
await assert.rejects(storage.changeStoredContent('publish', state.revision), error => error.status === 429);
await pauseWrites();
state = await storage.changeStoredContent('publish', state.revision);
assert.equal(state.document.published.profile.heroLead, modified.profile.heroLead);
await pauseWrites();
const firstSnapshot = state.document.versions.at(-1).id;
state = await storage.changeStoredContent('restore', state.revision, undefined, firstSnapshot);
assert.equal(state.document.draft.profile.heroLead, initial.profile.heroLead);
assert.equal(state.document.published.profile.heroLead, modified.profile.heroLead);
await assert.rejects(storage.readContentVersion('../content'), error => error.status === 404);
const exported = await storage.readContentVersion(firstSnapshot);
assert.equal(exported.draft.profile.heroLead, initial.profile.heroLead);
await pauseWrites();
const commonRevision = state.revision;
const competing = await Promise.allSettled([
  storage.changeStoredContent('save', commonRevision, modified),
  storage.changeStoredContent('save', commonRevision, initial),
]);
assert.equal(competing.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(competing.find(result => result.status === 'rejected').reason.status, 409);
state = await storage.readStoredContent();
await pauseWrites();
rejectSnapshot = true;
await assert.rejects(storage.changeStoredContent('save', state.revision, modified));
rejectSnapshot = false;
assert.equal((await storage.readStoredContent()).revision, state.revision);
rejectDocument = true;
await assert.rejects(storage.changeStoredContent('save', state.revision, modified));
rejectDocument = false;
assert.equal((await storage.readStoredContent()).revision, state.revision);
rejectRead = true;
await assert.rejects(storage.readStoredContent());
rejectRead = false;
const removed = state.document.versions[0].id;
state = await storage.changeStoredContent('remove-version', state.revision, undefined, removed);
assert.ok(!state.document.versions.some(version => version.id === removed));
assert.ok(!blobs.has(`portfolio/versions/${removed}.json`));
await assert.rejects(storage.readContentVersion(removed), error => error.status === 404);
await pauseWrites();
const entry = blobs.get('portfolio/content.json');
const full = JSON.parse(entry.body);
full.versions = Array.from({ length: 50 }, () => ({ id: randomUUID(), createdAt: new Date().toISOString(), action: 'save' }));
entry.body = JSON.stringify(full);
await assert.rejects(storage.changeStoredContent('save', entry.etag, modified), error => error.status === 409);
full.versions = [];
entry.body = JSON.stringify(full);
await pauseWrites();
rejectDocument = 'conditional';
await assert.rejects(storage.changeStoredContent('save', entry.etag, modified), error => error.status === 409);
rejectDocument = false;
// A metadata/content race must never pair an old body with a newer revision.
changeRevisionDuringRead = true;
await assert.rejects(storage.readStoredContent(), error => error.status === 409);
state = await storage.readStoredContent();
assert.equal(state.revision, blobs.get('portfolio/content.json').etag);
assert.ok(!state.revision.startsWith('W/'));
console.log('[storage-revision] passed: weak download ETag, strong storage revision, concurrent read rejected');
console.log('[content-storage] passed: private draft, publication, stale revision, concurrent winner, restoration, export, failure preservation, explicit removal, rate and history bounds');

// Request-scoped public selection must ignore a draft-mode cookie without owner authentication.
let draftEnabled = true;
let session = null;
const rendered = loadModule('lib/renderedContent.ts', {
  'server-only': {}, react: { cache: callback => callback }, 'next/headers': { draftMode: async () => ({ isEnabled: draftEnabled }) },
  '@/auth': { auth: async () => session }, '@/content/site': { siteContent: initial },
  './contentStorage': { remoteContentEnabled: () => true, readStoredContent: async () => ({ document: { draft: modified, published: initial } }) },
});
process.env.ADMIN_GITHUB_ID = 'owner';
assert.equal((await rendered.readRenderedContent()).profile.heroLead, initial.profile.heroLead);
session = { user: { id: 'other' } };
assert.equal((await rendered.readRenderedContent()).profile.heroLead, initial.profile.heroLead);
session = { user: { id: 'owner' } };
assert.equal((await rendered.readRenderedContent()).profile.heroLead, modified.profile.heroLead);
draftEnabled = false;
assert.equal((await rendered.readRenderedContent()).profile.heroLead, initial.profile.heroLead);
console.log('[rendered-content] passed: forged preview cookie, non-owner, owner preview, published mode');
