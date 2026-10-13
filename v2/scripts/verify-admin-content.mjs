import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { encode } from 'next-auth/jwt';

const origin = 'http://localhost:4089';
const secret = randomBytes(32).toString('hex');
const ownerId = '110824159';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4089'], {
  env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'dev/portfolio-admin-online', ADMIN_AUTH_PREVIEW: 'true', ADMIN_CONTENT_PREVIEW: 'true', AUTH_URL: origin, AUTH_SECRET: secret, AUTH_GITHUB_ID: 'fake-client', AUTH_GITHUB_SECRET: 'fake-secret', ADMIN_GITHUB_ID: ownerId, BLOB_STORE_ID: 'test-store-without-credentials', BLOB_READ_WRITE_TOKEN: '', VERCEL_OIDC_TOKEN: '' },
  stdio: 'ignore',
});
async function request(path, options = {}) {
  const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(8000), ...options });
  const text = await response.text();
  return { status: response.status, headers: response.headers, text };
}
async function sessionCookie(id, maxAge = 60) {
  return `authjs.session-token=${await encode({ secret, salt: 'authjs.session-token', token: { adminGithubId: id }, maxAge })}`;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Server exited');
    try { await request('/api/auth/session'); ready = true; break; } catch { await setTimeout(100); }
  }
  assert.ok(ready);
  const paths = ['/api/admin/content', '/api/admin/media'];
  const wrongCookie = await sessionCookie('wrong-owner');
  const expiredCookie = await sessionCookie(ownerId, -3600);
  for (const cookie of ['', wrongCookie, expiredCookie]) {
    for (const path of paths) {
      assert.equal((await request(path, { headers: { cookie } })).status, 404);
      assert.equal((await request(path, { method: path.endsWith('/media') ? 'POST' : 'PUT', headers: { cookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
    }
    assert.equal((await request('/api/admin/content', { method: 'POST', headers: { cookie, Origin: origin }, body: '{}' })).status, 404);
    assert.equal((await request('/api/admin/preview', { method: 'POST', headers: { cookie, Origin: origin } })).status, 404);
    assert.equal((await request('/admin', { headers: { cookie } })).status, 307);
  }
  const ownerCookie = await sessionCookie(ownerId);
  assert.equal(JSON.parse((await request('/api/auth/session', { headers: { cookie: ownerCookie } })).text).user.id, ownerId);
  assert.equal((await request('/admin', { headers: { cookie: ownerCookie } })).status, 200);
  for (const foreignOrigin of [undefined, 'https://foreign-origin.invalid']) {
    const headers = { cookie: ownerCookie, ...(foreignOrigin ? { Origin: foreignOrigin } : {}) };
    assert.equal((await request('/api/admin/content', { method: 'PUT', headers, body: '{}' })).status, 404);
    assert.equal((await request('/api/admin/content', { method: 'POST', headers, body: '{}' })).status, 404);
    assert.equal((await request('/api/admin/preview', { method: 'POST', headers })).status, 404);
  }
  const missingStore = await request('/api/admin/content', { headers: { cookie: ownerCookie } });
  assert.equal(missingStore.status, 503);
  assert.match(missingStore.headers.get('cache-control'), /private.*no-store/);
  assert.ok(!missingStore.text.includes('fake-secret'));
  const invalid = await request('/api/admin/content', { method: 'PUT', headers: { cookie: ownerCookie, Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalid.status, 400);
  const preview = await request('/api/admin/preview', { method: 'POST', headers: { cookie: ownerCookie, Origin: origin } });
  assert.equal(preview.status, 303);
  assert.ok(preview.headers.get('set-cookie'));
  const legacyUpload = await request('/api/admin/media', { method: 'POST', headers: { cookie: ownerCookie, Origin: origin } });
  assert.equal(legacyUpload.status, 404);
  console.log('[admin-content] passed: anonymous/non-owner/expired denial, owner editor, foreign/missing origin denial, private storage failure, validation, private preview, no remote filesystem uploads');
  console.log('[admin-content] synthetic signed sessions; no real OAuth or Blob persistence claimed');
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
}
