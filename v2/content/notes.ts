export interface JournalNote {
  visibility?: 'draft' | 'published';
  slug: string;
  title: string;
  date: string;
  intro: string;
  heroImage?: { src: string; alt: string; caption: string; width: number; height: number };
  sections: { heading: string; body: string }[];
  sources: { label: string; href: string }[];
}

import { siteContent } from './site';

export const notes = siteContent.notes.filter((note) => note.visibility !== 'draft');

export function getNote(slug: string) {
  return notes.find((note) => note.slug === slug);
}
