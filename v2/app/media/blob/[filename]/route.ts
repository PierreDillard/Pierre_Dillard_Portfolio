import type { NextRequest } from 'next/server';
import { get, head } from '@vercel/blob';
import { adminAccessAllowed } from '@/lib/adminAccess';
import { readStoredContent, remoteContentEnabled } from '@/lib/contentStorage';
import { missingMedia, readVerifiedMedia } from '@/lib/mediaLibrary';
import { collectMediaSources, parseMediaRange, storedMediaPrefix, validMediaFilename } from '@/lib/mediaSources';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    if (!remoteContentEnabled() || !validMediaFilename(filename)) return new Response('Not found', { status: 404, headers: privateHeaders });
    const owner = await adminAccessAllowed(request);
    if (!owner) {
      const stored = await readStoredContent();
      if (!collectMediaSources(stored.document.published, true).includes(`${storedMediaPrefix}${filename}`)) return new Response('Not found', { status: 404, headers: privateHeaders });
    }
    const record = await readVerifiedMedia(filename);
    if (!record) return new Response('Not found', { status: 404, headers: privateHeaders });
    const abortSignal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
    const metadata = await head(record.pathname, { abortSignal });
    if (metadata.etag !== record.etag || metadata.size !== record.size || metadata.contentType !== record.contentType) return new Response('Not found', { status: 404, headers: privateHeaders });
    let range;
    try { range = request.method === 'HEAD' ? null : parseMediaRange(request.headers.get('range'), record.size); }
    catch { return new Response(null, { status: 416, headers: { ...privateHeaders, 'Content-Range': `bytes */${record.size}` } }); }
    const headers = new Headers({ ...privateHeaders, 'Content-Type': record.contentType, 'Accept-Ranges': 'bytes', 'Content-Disposition': `${record.contentType === 'application/pdf' ? 'attachment' : 'inline'}; filename="${filename}"` });
    if (request.method === 'HEAD') { headers.set('Content-Length', String(record.size)); return new Response(null, { headers }); }
    const response = await get(record.pathname, { access: 'private', useCache: false, abortSignal, headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {} });
    if (!response || response.statusCode !== 200) return new Response('Not found', { status: 404, headers: privateHeaders });
    try {
      const after = await head(record.pathname, { abortSignal });
      if (after.etag !== record.etag) { await response.stream.cancel(); return new Response('Not found', { status: 404, headers: privateHeaders }); }
      const contentRange = response.headers.get('content-range');
      if (range && contentRange !== `bytes ${range.start}-${range.end}/${record.size}`) {
        await response.stream.cancel(); return new Response('Lecture partielle indisponible.', { status: 503, headers: privateHeaders });
      }
      headers.set('Content-Length', String(range ? range.end - range.start + 1 : record.size));
      if (range) headers.set('Content-Range', contentRange!);
      return new Response(response.stream, { status: range ? 206 : 200, headers });
    } catch (error) { await response.stream.cancel().catch(() => undefined); throw error; }
  } catch (error) { return new Response(missingMedia(error) ? 'Not found' : 'Média indisponible.', { status: missingMedia(error) ? 404 : 503, headers: privateHeaders }); }
}
export const HEAD = GET;
