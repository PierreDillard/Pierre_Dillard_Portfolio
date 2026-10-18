import type { SiteContent } from '@/content/site';

export const storedMediaPrefix = '/media/blob/';
export const quarantinePrefix = 'portfolio/media/quarantine/';
export const verifiedMediaPrefix = 'portfolio/media/verified/';
const mediaFilename = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp|avif|mp4|webm|pdf)$/;
export function validMediaFilename(value: unknown): value is string { return typeof value === 'string' && mediaFilename.test(value); }
export function isStoredMediaSource(value: string) { return value.startsWith(storedMediaPrefix) && validMediaFilename(value.slice(storedMediaPrefix.length)); }
export function mediaKind(source: string): 'image' | 'video' | 'pdf' {
  return /\.(mp4|webm)$/.test(source) ? 'video' : source.endsWith('.pdf') ? 'pdf' : 'image';
}
export function collectMediaSources(content: SiteContent, publishedOnly = false): string[] {
  const projects = content.projects.filter(project => !publishedOnly || project.visibility !== 'draft');
  const notes = content.notes.filter(note => !publishedOnly || note.visibility !== 'draft');
  return [...new Set([content.profile.portraitSrc, content.profile.cvSrc,
    ...projects.flatMap(project => project.media.flatMap(media => [media.src, ...(media.poster ? [media.poster] : [])])),
    ...notes.flatMap(note => note.heroImage ? [note.heroImage.src] : []),
  ])];
}
export function parseMediaRange(value: string | null, size: number) {
  if (value === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error('Invalid range');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw new Error('Invalid range');
  return { start, end };
}
