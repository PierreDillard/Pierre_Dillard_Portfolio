import { randomUUID } from 'node:crypto';
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { adminAccessAllowed } from '@/lib/adminAccess';

const mediaPath = path.join(process.cwd(), 'public', 'media');
const uploadPath = path.join(mediaPath, 'uploads');
const allowedTypes: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'application/pdf': '.pdf' };

export async function GET(request: NextRequest) {
  if (!(await adminAccessAllowed(request))) return new Response('Not found', { status: 404 });
  const baseFiles = await readdir(mediaPath, { withFileTypes: true });
  const uploads = await readdir(uploadPath).catch(() => []);
  const files = [...baseFiles.filter((entry) => entry.isFile()).map((entry) => `/media/${entry.name}`), ...uploads.map((name) => `/media/uploads/${name}`)];
  return NextResponse.json(files.filter((file) => /\.(png|jpe?g|webp|avif|svg|mp4|webm|pdf)$/i.test(file)).sort());
}

export async function POST(request: NextRequest) {
  if (!(await adminAccessAllowed(request, true))) return new Response('Not found', { status: 404 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    const extension = allowedTypes[file.type];
    if (!extension) return NextResponse.json({ error: 'Format autorisé : PNG, JPEG, WebP, AVIF, MP4, WebM ou PDF.' }, { status: 400 });
    if (file.size > 250 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop grand (250 Mo maximum en local).' }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid = extension === '.png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) :
      extension === '.jpg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) :
      extension === '.webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' :
      extension === '.avif' ? bytes.toString('ascii', 4, 8) === 'ftyp' :
      extension === '.mp4' ? bytes.toString('ascii', 4, 8) === 'ftyp' :
      extension === '.webm' ? bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex')) :
      bytes.toString('ascii', 0, 5) === '%PDF-';
    if (!valid) return NextResponse.json({ error: 'Le contenu du fichier ne correspond pas à son format.' }, { status: 400 });
    await mkdir(uploadPath, { recursive: true });
    const stem = path.parse(file.name).name.normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase().slice(0, 55) || 'media';
    const fileName = `${stem}-${randomUUID().slice(0, 8)}${extension}`;
    await writeFile(path.join(uploadPath, fileName), bytes, { flag: 'wx' });
    return NextResponse.json({ src: `/media/uploads/${fileName}`, kind: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'pdf' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import impossible.' }, { status: 400 });
  }
}
