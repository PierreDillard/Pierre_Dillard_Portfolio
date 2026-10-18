import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';

function loadModule(filename, imports) {
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code} })`, { process, Buffer, Date, AbortSignal, Response, Headers })(name => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports;
}
process.env.MEDIA_UPLOAD_MAX_BYTES = '8388608';
process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.BLOB_STORE_ID = 'synthetic-library-store';
const sources = loadModule('lib/mediaSources.ts', {});
const policy = loadModule('lib/mediaUploadPolicy.ts', { 'node:crypto': crypto });
class BlobNotFoundError extends Error {}
const objects = new Map();
let sequence = 0;
let ignoreRange = false;
let rawReads = 0;
let writeFailure = false;
const sdk = {
  BlobNotFoundError,
  async head(pathname) {
    const entry = objects.get(pathname); if (!entry) throw new BlobNotFoundError();
    return { pathname, size: entry.body.length, contentType: entry.contentType, etag: entry.etag };
  },
  async get(pathname, options) {
    assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
    const entry = objects.get(pathname); if (!entry) return null;
    let body = entry.body;
    const headers = new Headers();
    if (pathname.startsWith(sources.quarantinePrefix)) rawReads++;
    if (options.headers?.Range && !ignoreRange) {
      const range = sources.parseMediaRange(options.headers.Range, body.length);
      headers.set('content-range', `bytes ${range.start}-${range.end}/${body.length}`);
      body = body.subarray(range.start, range.end + 1);
    }
    return { statusCode: 200, stream: new Response(body).body, headers, blob: { size: body.length, contentType: entry.contentType } };
  },
  async put(pathname, body, options) {
    if (writeFailure) throw new Error('Storage unavailable');
    assert.equal(options.access, 'private'); assert.equal(options.addRandomSuffix, false);
    objects.set(pathname, { body: Buffer.from(body), contentType: options.contentType, etag: `revision-${++sequence}` });
    return { pathname };
  },
  async list(options) {
    assert.equal(options.prefix, sources.quarantinePrefix); assert.equal(options.limit, 24);
    const all = [...objects.entries()].filter(([pathname]) => pathname.startsWith(options.prefix)).sort(([first], [second]) => first.localeCompare(second));
    const offset = Number(options.cursor || 0);
    return { blobs: all.slice(offset, offset + options.limit).map(([pathname, entry]) => ({ pathname, size: entry.body.length, etag: entry.etag })), hasMore: all.length > offset + options.limit, cursor: String(offset + options.limit) };
  },
};
const library = loadModule('lib/mediaLibrary.ts', { 'server-only': {}, '@vercel/blob': sdk, './mediaSources': sources, './mediaUploadPolicy': policy });
const uploads = loadModule('lib/mediaUploadStorage.ts', { 'server-only': {}, 'node:crypto': crypto, '@vercel/blob': sdk, './mediaUploadPolicy': policy, './mediaLibrary': library });
const filename = `${crypto.randomUUID()}.png`;
const pathname = sources.quarantinePrefix + filename;
const bytes = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)]);
objects.set(pathname, { body: bytes, contentType: 'image/png', etag: 'image-original' });
assert.equal(await library.readVerifiedMedia(filename), null);
assert.equal((await library.listLibraryMedia()).items[0].verified, false);
await assert.rejects(library.existingMediaTicket('../content.json'), error => error.status === 404);
const verified = await uploads.verifyStoredMedia(await library.existingMediaTicket(filename));
assert.equal(verified.src, sources.storedMediaPrefix + filename);
assert.equal(verified.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
assert.equal((await library.listLibraryMedia()).items[0].verified, true);
assert.equal((await library.readVerifiedMedia(filename)).etag, 'image-original');

const initial = JSON.parse(readFileSync('content/site.json', 'utf8'));
const document = { draft: structuredClone(initial), published: structuredClone(initial) };
document.draft.profile.portraitSrc = verified.src;
await library.assertVerifiedMediaReferences(document.draft);
objects.get(pathname).etag = 'changed';
await assert.rejects(library.assertVerifiedMediaReferences(document.draft), error => error.status === 409);
assert.equal((await library.listLibraryMedia()).items[0].verified, false);
objects.get(pathname).etag = 'image-original';
const missing = structuredClone(document.draft); missing.profile.portraitSrc = sources.storedMediaPrefix + crypto.randomUUID() + '.png';
await assert.rejects(library.assertVerifiedMediaReferences(missing), error => error.status === 400);
missing.profile.portraitSrc = '/media/blob/invalid.png';
await assert.rejects(library.assertVerifiedMediaReferences(missing), error => error.status === 400);

let owner = false;
const access = { adminAccessAllowed: async (request, write = false) => owner && (!write || request.headers.get('origin') === request.nextUrl.origin) };
const content = { remoteContentEnabled: () => true, readStoredContent: async () => ({ document }) };
const delivery = loadModule('app/media/blob/[filename]/route.ts', { '@vercel/blob': sdk, '@/lib/adminAccess': access, '@/lib/contentStorage': content, '@/lib/mediaLibrary': library, '@/lib/mediaSources': sources });
function request(path = verified.src, options = {}) {
  const value = new Request('https://portfolio.example' + path, options);
  value.nextUrl = new URL(value.url); return value;
}
const context = { params: Promise.resolve({ filename }) };
rawReads = 0;
assert.equal((await delivery.GET(request(), context)).status, 404, 'Saved draft remains private');
assert.equal(rawReads, 0, 'Do not download private bytes for visitors');
owner = true;
let response = await delivery.GET(request(), context);
assert.equal(response.status, 200);
assert.match(response.headers.get('cache-control'), /private.*no-store/);
assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
owner = false;
document.published.profile.portraitSrc = verified.src;
response = await delivery.GET(request(), context);
assert.equal(response.status, 200, 'Only saved published references permit visitor access');
await response.body.cancel();
response = await delivery.GET(request(verified.src, { headers: { Range: 'bytes=1-3' } }), context);
assert.equal(response.status, 206);
assert.equal(response.headers.get('content-range'), `bytes 1-3/${bytes.length}`);
assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(1, 4));
response = await delivery.GET(request(verified.src, { headers: { Range: 'bytes=-3' } }), context);
assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 3);
for (const range of ['bytes=1000-', 'bytes=3-1', 'bytes=0-1,3-4', 'bytes=-0', 'other=0-2']) assert.equal((await delivery.GET(request(verified.src, { headers: { Range: range } }), context)).status, 416);
rawReads = 0;
response = await delivery.HEAD(request(verified.src, { method: 'HEAD' }), context);
assert.equal(response.status, 200); assert.equal(response.headers.get('content-length'), String(bytes.length)); assert.equal(rawReads, 0);
ignoreRange = true;
assert.equal((await delivery.GET(request(verified.src, { headers: { Range: 'bytes=1-3' } }), context)).status, 503, 'Never label a full upstream response as partial');
ignoreRange = false;
document.published.profile.portraitSrc = initial.profile.portraitSrc;
document.published.projects[0].visibility = 'draft';
document.published.projects[0].media[0].src = verified.src;
assert.equal((await delivery.GET(request(), context)).status, 404, 'Hidden projects inside the published snapshot must not expose their files');
document.published.projects[0].visibility = 'published';
response = await delivery.GET(request(), context); assert.equal(response.status, 200); await response.body.cancel();
document.published.projects[0].media[0].src = initial.projects[0].media[0].src;
assert.equal((await delivery.GET(request(), context)).status, 404, 'Unpublish revokes access on the next request');
owner = true; objects.get(pathname).etag = 'replaced';
assert.equal((await delivery.GET(request(), context)).status, 404, 'Changed objects require verification again');
objects.get(pathname).etag = 'image-original';

const api = loadModule('app/api/admin/media/library/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/adminAccess': access, '@/lib/contentStorage': content, '@/lib/mediaLibrary': library, '@/lib/mediaUploadPolicy': policy, '@/lib/mediaUploadStorage': uploads });
owner = false;
assert.equal((await api.GET(request('/api/admin/media/library'))).status, 404);
assert.equal((await api.POST(request('/api/admin/media/library', { method: 'POST', body: JSON.stringify({ filename }) }))).status, 404);
owner = true;
assert.equal((await api.POST(request('/api/admin/media/library', { method: 'POST', headers: { Origin: 'https://foreign.example' }, body: JSON.stringify({ filename }) }))).status, 404);
response = await api.POST(request('/api/admin/media/library', { method: 'POST', headers: { Origin: 'https://portfolio.example' }, body: JSON.stringify({ filename }) }));
assert.equal(response.status, 200); assert.equal((await response.json()).src, verified.src);
assert.equal((await api.POST(request('/api/admin/media/library', { method: 'POST', headers: { Origin: 'https://portfolio.example' }, body: 'x'.repeat(1025) }))).status, 413);

const badFilename = `${crypto.randomUUID()}.png`;
objects.set(sources.quarantinePrefix + badFilename, { body: Buffer.from('<html>not a PNG</html>'), contentType: 'image/png', etag: 'invalid' });
await assert.rejects(uploads.verifyStoredMedia(await library.existingMediaTicket(badFilename)), error => error.status === 400);
assert.equal(await library.readVerifiedMedia(badFilename), null, 'Invalid bytes never become selectable');
writeFailure = true;
await assert.rejects(uploads.verifyStoredMedia(await library.existingMediaTicket(filename)));
writeFailure = false;
for (let index = 0; index < 25; index++) objects.set(sources.quarantinePrefix + crypto.randomUUID() + '.png', { body: bytes, contentType: 'image/png', etag: `entry-${index}` });
const firstPage = await library.listLibraryMedia();
assert.equal(firstPage.items.length, 24); assert.ok(firstPage.cursor);
const secondPage = await library.listLibraryMedia(firstPage.cursor);
assert.equal(secondPage.items.length, 3); assert.equal(secondPage.cursor, undefined);
console.log('[media-library] passed: legacy discovery/reverification, persistent verified records, exact-size/hash, stale/missing reference rejection, paginated inventory and write-failure preservation.');
console.log('[media-delivery] passed: owner-only drafts, published visibility, hidden-project denial, unpublish denial, changed-object denial, no shared caching, HEAD and strict single Range semantics.');
console.log('[media-library] synthetic storage/sessions only; no real provider Range, publication, browser UI or redeploy proof.');
