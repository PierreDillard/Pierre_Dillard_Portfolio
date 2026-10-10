import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { validateSiteContent } from '@/content/validate';
import { migrateSiteContent } from '@/content/site';
import { adminAccessAllowed } from '@/lib/adminAccess';

const contentPath = path.join(process.cwd(), 'content', 'site.json');
const backupPath = path.join(process.cwd(), 'content', 'backups');

export async function GET(request: NextRequest) {
  if (!(await adminAccessAllowed(request))) return new Response('Not found', { status: 404 });
  return NextResponse.json(migrateSiteContent(JSON.parse(await readFile(contentPath, 'utf8'))), { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  if (!(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return NextResponse.json({ error: 'Le contenu dépasse 1 Mo.' }, { status: 413 });
    const content: unknown = JSON.parse(rawBody);
    validateSiteContent(content);
    await mkdir(backupPath, { recursive: true });
    const previous = await readFile(contentPath, 'utf8');
    const backupName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
    await writeFile(path.join(backupPath, backupName), previous, { flag: 'wx' });
    const temporaryPath = `${contentPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, contentPath);
    return NextResponse.json({ ok: true, backup: backupName });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Enregistrement impossible.' }, { status: 400 });
  }
}
