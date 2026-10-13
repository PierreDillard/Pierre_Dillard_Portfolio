import 'server-only';
import { cache } from 'react';
import { draftMode } from 'next/headers';
import { auth } from '@/auth';
import { siteContent } from '@/content/site';
import { readStoredContent, remoteContentEnabled } from './contentStorage';

// No shared cache: a draft may only be read during an authenticated owner request.
export const readRenderedContent = cache(async () => {
  if (!remoteContentEnabled()) return siteContent;
  const stored = await readStoredContent();
  if ((await draftMode()).isEnabled) {
    const session = await auth();
    if (session?.user?.id === process.env.ADMIN_GITHUB_ID) return { ...stored.document.draft, projects: stored.document.draft.projects.map(project => ({ ...project, visibility: 'published' as const })), notes: stored.document.draft.notes.map(note => ({ ...note, visibility: 'published' as const })) };
  }
  return { ...stored.document.published,
    projects: stored.document.published.projects.filter(project => project.visibility !== 'draft'),
    notes: stored.document.published.notes.filter(note => note.visibility !== 'draft'),
  };
});
