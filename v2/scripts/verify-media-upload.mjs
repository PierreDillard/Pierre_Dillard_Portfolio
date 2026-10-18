import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { encode } from 'next-auth/jwt';
import ts from 'typescript';

function loadModule(filename, imports) {
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require, module, exports) { ${code} })`, { process, Buffer, Date, AbortSignal })(name => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports;
}
process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.BLOB_STORE_ID = 'synthetic-media-store';
process.env.MEDIA_UPLOAD_MAX_BYTES = '8388608';
const policy = loadModule('lib/mediaUploadPolicy.ts', { 'node:crypto': crypto });
const savedEnvironment = { ...process.env };
for (const [environment, branch, previewFlag, productionFlag, expected] of [
  ['production', 'master', 'false', 'true', true],
  ['production', 'master', 'true', 'false', false],
  ['production', 'dev/portfolio-media', 'true', 'true', false],
  ['preview', 'master', 'true', 'true', false],
  ['preview', 'dev/portfolio-media', 'true', 'false', true],
  ['preview', 'dev/portfolio-media', 'false', 'true', false],
  ['development', 'master', 'true', 'true', false],
]) {
  Object.assign(process.env, { VERCEL_ENV: environment, VERCEL_GIT_COMMIT_REF: branch, ADMIN_MEDIA_PREVIEW: previewFlag, ADMIN_MEDIA_PRODUCTION_ENABLED: productionFlag });
  assert.equal(policy.mediaUploadEnabled(), expected, `${environment}/${branch} activation`);
}
for (const name of ['VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'ADMIN_MEDIA_PREVIEW', 'ADMIN_MEDIA_PRODUCTION_ENABLED']) {
  if (savedEnvironment[name] === undefined) delete process.env[name]; else process.env[name] = savedEnvironment[name];
}
const isProduction = process.argv.includes('--production');
for (const limit of ['', '0', '-1', 'NaN', '1.5', '33554433']) {
  process.env.MEDIA_UPLOAD_MAX_BYTES = limit;
  assert.throws(() => policy.mediaUploadMaximumBytes(), error => error.status === 503);
}
process.env.MEDIA_UPLOAD_MAX_BYTES = '8388608';
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32)]);
const authorization = policy.prepareMediaUpload({ name: 'capture.png', contentType: 'image/png', size: png.length });
assert.match(authorization.pathname, /^portfolio\/media\/quarantine\/[a-f0-9-]{36}\.png$/);
assert.equal(policy.readMediaUploadTicket(authorization.ticket).pathname, authorization.pathname);
assert.notEqual(policy.prepareMediaUpload({ name: 'capture.png', contentType: 'image/png', size: 10 }).pathname, authorization.pathname);
for (const metadata of [
  { name: '../escape.png', contentType: 'image/png', size: 10 },
  { name: 'capture.svg', contentType: 'image/svg+xml', size: 10 },
  { name: 'capture.png', contentType: 'image/png', size: 0 },
  { name: 'capture.png', contentType: 'image/png', size: 8388609 },
]) assert.throws(() => policy.prepareMediaUpload(metadata));
assert.throws(() => policy.readMediaUploadTicket(authorization.ticket.replace(/^./, 'X')));
const originalStore = process.env.BLOB_STORE_ID;
process.env.BLOB_STORE_ID = 'other-store';
assert.throws(() => policy.readMediaUploadTicket(authorization.ticket));
process.env.BLOB_STORE_ID = originalStore;
const realNow = Date.now;
try { Date.now = () => realNow() + 601000; assert.throws(() => policy.readMediaUploadTicket(authorization.ticket)); } finally { Date.now = realNow; }
const avif = Buffer.from('00000018667479706176696600000000617669666d696631', 'hex');
const mp4 = Buffer.from('000000186674797069736f6d0000000069736f6d6d703432', 'hex');
assert.equal(policy.mediaSignatureMatches(avif, 'image/avif'), true);
assert.equal(policy.mediaSignatureMatches(avif, 'video/mp4'), false);
assert.equal(policy.mediaSignatureMatches(mp4, 'image/avif'), false);
assert.equal(policy.mediaSignatureMatches(mp4, 'video/mp4'), true);
assert.equal(policy.mediaSignatureMatches(Buffer.from('<script>alert(1)</script>'), 'image/png'), false);
let storedBytes = png;
let metadataSize = png.length;
let revisionChanged = false;
let headCalls = 0;
const storage = loadModule('lib/mediaUploadStorage.ts', {
  'server-only': {}, 'node:crypto': crypto, './mediaUploadPolicy': policy,
  '@vercel/blob': {
    async head(pathname) { headCalls++; return { pathname, size: metadataSize, contentType: 'image/png', etag: revisionChanged && headCalls % 2 === 0 ? 'changed' : 'initial' }; },
    async get(pathname, options) { assert.equal(pathname, authorization.pathname); assert.equal(options.access, 'private'); assert.equal(options.useCache, false); return { statusCode: 200, stream: new Response(storedBytes).body }; },
  },
});
assert.equal((await storage.verifyMediaUpload(authorization.ticket)).sha256, crypto.createHash('sha256').update(png).digest('hex'));
storedBytes = Buffer.alloc(png.length);
await assert.rejects(storage.verifyMediaUpload(authorization.ticket), error => error.status === 400);
storedBytes = Buffer.concat([png, Buffer.from('extra')]);
await assert.rejects(storage.verifyMediaUpload(authorization.ticket), error => error.status === 413);
storedBytes = png.subarray(0, 8);
await assert.rejects(storage.verifyMediaUpload(authorization.ticket), error => error.status === 400);
storedBytes = png; metadataSize++;
await assert.rejects(storage.verifyMediaUpload(authorization.ticket), error => error.status === 400);
metadataSize = png.length; revisionChanged = true; headCalls = 0;
await assert.rejects(storage.verifyMediaUpload(authorization.ticket), error => error.status === 409);
console.log('[media-upload] policy and bounded reread checks passed (synthetic storage; signature checks do not prove decoding).');

const origin = 'http://localhost:4091';
const ownerId = '110824159';
const keypair = crypto.generateKeyPairSync('ed25519');
const secret = process.env.AUTH_SECRET;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4091'], {
  env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: isProduction ? 'production' : 'preview', VERCEL_GIT_COMMIT_REF: isProduction ? 'master' : 'dev/portfolio-media', ADMIN_MEDIA_PREVIEW: isProduction ? 'false' : 'true', ADMIN_MEDIA_PRODUCTION_ENABLED: isProduction ? 'true' : 'false', ADMIN_PRODUCTION_ENABLED: isProduction ? 'true' : 'false', ADMIN_AUTH_PREVIEW: 'true', ADMIN_CONTENT_PREVIEW: 'true', AUTH_URL: origin, AUTH_SECRET: secret, AUTH_GITHUB_ID: 'fake-client', AUTH_GITHUB_SECRET: 'fake-secret', ADMIN_GITHUB_ID: ownerId, BLOB_READ_WRITE_TOKEN: '', VERCEL_OIDC_TOKEN: '', BLOB_WEBHOOK_PUBLIC_KEY: keypair.publicKey.export({ format: 'pem', type: 'spki' }) },
  stdio: 'ignore',
});
async function cookieFor(id) { return `authjs.session-token=${await encode({ secret, salt: 'authjs.session-token', token: { adminGithubId: id }, maxAge: 60 })}`; }
async function request(options = {}) { return fetch(origin + '/api/admin/media/upload', { signal: AbortSignal.timeout(8000), ...options }); }
const ownerCookie = await cookieFor(ownerId);
const headers = { cookie: ownerCookie, Origin: origin, 'Content-Type': 'application/json' };
const post = (body, extraHeaders = headers) => request({ method: 'POST', headers: extraHeaders, body: JSON.stringify(body) });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Server exited');
    try { await request(); ready = true; break; } catch { await setTimeout(100); }
  }
  assert.ok(ready, 'Built server ready');
  for (const cookie of ['', await cookieFor('non-owner')]) {
    assert.equal((await request({ headers: { cookie } })).status, 404);
    assert.equal((await post({ action: 'prepare' }, { ...headers, cookie })).status, 404);
  }
  for (const foreignOrigin of ['', 'https://foreign.invalid']) assert.equal((await post({ action: 'prepare' }, { ...headers, Origin: foreignOrigin })).status, 404);
  const configuration = await request({ headers: { cookie: ownerCookie } });
  assert.equal(configuration.status, 200);
  assert.match(configuration.headers.get('cache-control'), /private.*no-store/);
  assert.equal((await configuration.json()).maximumSizeInBytes, 8388608);
  assert.equal((await post({ action: 'prepare', name: 'test.svg', contentType: 'image/svg+xml', size: 10 })).status, 400);
  assert.equal((await post({ action: 'prepare', name: 'test.png', contentType: 'image/png', size: 8388609 })).status, 413);
  assert.equal((await post({ action: 'prepare', name: 'x'.repeat(9000) })).status, 413);
  const preparedResponse = await post({ action: 'prepare', name: 'test.png', contentType: 'image/png', size: 6000000 });
  assert.equal(preparedResponse.status, 200);
  const prepared = await preparedResponse.json();
  assert.equal(policy.readMediaUploadTicket(prepared.ticket).size, 6000000);
  assert.equal((await post({ type: 'blob.generate-presigned-url', payload: { pathname: 'portfolio/content.json', clientPayload: prepared.ticket, multipart: false } })).status, 400);
  assert.equal((await post({ type: 'blob.generate-presigned-url', payload: { pathname: prepared.pathname, clientPayload: prepared.ticket, multipart: true } })).status, 400);
  assert.equal((await post({ action: 'verify', ticket: prepared.ticket + 'tampered' })).status, 400);
  const callback = { type: 'blob.upload-completed', payload: { blob: { pathname: prepared.pathname, contentType: 'image/png' }, tokenPayload: 'invalid-ticket' } };
  assert.equal((await post(callback, { 'Content-Type': 'application/json' })).status, 404);
  assert.equal((await post(callback, { 'Content-Type': 'application/json', 'x-vercel-signature': '0'.repeat(128) })).status, 403);
  const signature = crypto.sign(null, Buffer.from(JSON.stringify(callback)), keypair.privateKey).toString('hex');
  assert.equal((await post(callback, { 'Content-Type': 'application/json', 'x-vercel-signature': signature })).status, 400, 'Valid provider signature reaches ticket validation without owner cookie');
  assert.equal((await post({ action: 'prepare' }, { 'Content-Type': 'application/json', 'x-vercel-signature': signature })).status, 400);
  console.log(`[media-upload] ${isProduction ? 'production' : 'preview'} built route passed: owner/origin guards, size/type/body/path restrictions, signed callback separation, ticket tampering.`);
  console.log('[media-upload] NO real OAuth, OIDC delegation, browser upload, provider callback, quota or persistence proof.');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
}
