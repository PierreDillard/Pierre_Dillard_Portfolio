import rawSite from './site.json';
import type { PortfolioProject } from './types';
import type { JournalNote } from './notes';

export interface SiteProfile {
  siteTitle: string;
  siteDescription: string;
  name: string;
  location: string;
  year: string;
  kicker: string;
  heroTitle: string;
  heroAccent: string;
  heroLead: string;
  featuredTitle: string;
  featuredAccent: string;
  featuredDescription: string;
  otherTitle: string;
  otherAccent: string;
  journalTitle: string;
  journalAccent: string;
  footerText: string;
  introTitle: string;
  introAccent: string;
  introStatement: string;
  introBody: string;
  expertiseTags: string[];
  contactKicker: string;
  contactTitle: string;
  contactAccent: string;
  email: string;
  portraitSrc: string;
  cvSrc: string;
}

export interface SiteContent {
  schemaVersion: 2;
  profile: SiteProfile;
  projects: PortfolioProject[];
  notes: JournalNote[];
}

const titlePrefixes = ['hero', 'intro', 'featured', 'other', 'journal', 'contact'] as const;

export function migrateSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object') throw new Error('Contenu invalide.');
  const document = value as Record<string, unknown>;
  if (document.schemaVersion === 2) return value as SiteContent;
  if (document.schemaVersion !== 1 || !document.profile || typeof document.profile !== 'object') throw new Error('Version de contenu inconnue.');

  const profile = { ...document.profile } as Record<string, unknown>;
  for (const prefix of titlePrefixes) {
    const before = String(profile[`${prefix}Before`] ?? '');
    const accent = String(profile[`${prefix}Accent`] ?? '');
    profile[`${prefix}Title`] = before.includes(accent) ? before : `${before} ${accent}`.trim();
    delete profile[`${prefix}Before`];
  }
  return { ...document, schemaVersion: 2, profile } as unknown as SiteContent;
}

export const siteContent = migrateSiteContent(rawSite);
