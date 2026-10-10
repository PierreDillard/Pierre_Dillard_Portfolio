import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const configurations = [
  { name: 'production closed', environment: 'production', branch: 'dev/portfolio-admin-online', enabled: 'true', configured: true, opens: false },
  { name: 'other preview branch closed', environment: 'preview', branch: 'master', enabled: 'true', configured: true, opens: false },
  { name: 'disabled preview closed', environment: 'preview', branch: 'dev/portfolio-admin-online', enabled: 'false', configured: true, opens: false },
  { name: 'missing OAuth closed', environment: 'preview', branch: 'dev/portfolio-admin-online', enabled: 'true', configured: false, opens: false },
  { name: 'configured preview login only', environment: 'preview', branch: 'dev/portfolio-admin-online', enabled: 'true', configured: true, opens: true },
];

for (const [configurationIndex, configuration] of configurations.entries()) {
  const port = 4077 + configurationIndex;
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VERCEL_ENV: configuration.environment,
      VERCEL_GIT_COMMIT_REF: configuration.branch,
      ADMIN_AUTH_PREVIEW: configuration.enabled,
      AUTH_URL: origin,
      AUTH_SECRET: configuration.configured ? randomBytes(32).toString('hex') : '',
      AUTH_GITHUB_ID: configuration.configured ? 'test-client' : '',
      AUTH_GITHUB_SECRET: configuration.configured ? 'test-secret' : '',
      ADMIN_GITHUB_ID: configuration.configured ? '110824159' : '',
    },
    stdio: 'ignore',
  });
  let wasReady = false;
  try {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (server.exitCode !== null) throw new Error(`Server exited for ${configuration.name}`);
      try {
        const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        wasReady = true;
        break;
      } catch {
        await setTimeout(100);
      }
    }
    assert.ok(wasReady, 'Production test server must start');
    for (const path of ['/admin', '/api/admin/content', '/api/admin/media']) {
      const response = await fetch(origin + path, { redirect: 'manual' });
      assert.equal(response.status, 404, `${configuration.name}: ${path} must stay closed`);
      await response.body?.cancel();
    }
    const sessionResponse = await fetch(`${origin}/api/auth/session`, { redirect: 'manual' });
    assert.equal(sessionResponse.status, configuration.opens ? 200 : 404, configuration.name);
    if (configuration.opens) assert.equal(await sessionResponse.json(), null);
    else await sessionResponse.body?.cancel();
    const pageResponse = await fetch(`${origin}/admin/connexion`, { redirect: 'manual' });
    assert.equal(pageResponse.status, configuration.opens ? 200 : 404, configuration.name);
    const html = await pageResponse.text();
    if (configuration.opens) {
      assert.ok(html.includes('Se connecter avec GitHub'));
      const actionName = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
      assert.ok(actionName, 'Real server sign-in action must be present');
      const validActionBody = new FormData();
      validActionBody.set(actionName, '');
      const acceptedOrigin = await fetch(`${origin}/admin/connexion`, {
        method: 'POST', redirect: 'manual', headers: { Origin: origin }, body: validActionBody,
      });
      assert.equal(acceptedOrigin.status, 303, 'Same-origin sign-in action must redirect');
      assert.equal(new URL(acceptedOrigin.headers.get('location')).hostname, 'github.com');
      await acceptedOrigin.body?.cancel();
      const foreignActionBody = new FormData();
      foreignActionBody.set(actionName, '');
      const rejectedOrigin = await fetch(`${origin}/admin/connexion`, {
        method: 'POST', redirect: 'manual',
        headers: { Origin: 'https://foreign-origin.invalid' },
        body: foreignActionBody,
      });
      assert.ok([400, 403, 500].includes(rejectedOrigin.status), `Foreign-origin action must be rejected, received ${rejectedOrigin.status}`);
      await rejectedOrigin.body?.cancel();
    }
    console.log(`[auth-preview] passed: ${configuration.name}`);
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once('exit', resolve);
    });
  }
}
