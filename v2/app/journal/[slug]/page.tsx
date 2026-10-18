import { isStoredMediaSource } from '@/lib/mediaSources';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { readRenderedContent } from '@/lib/renderedContent';

export const dynamic = 'force-dynamic';

export default async function JournalNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await readRenderedContent();
  const note = content.notes.find(note => note.slug === slug && note.visibility !== 'draft');
  if (!note) notFound();
  return <><SiteHeader /><main className="journal-article"><Link className="back-link" href="/journal">← Retour au journal</Link><time dateTime={note.date}>{note.date} / NOTE DE TERRAIN</time><h1>{note.title}</h1><p className="standfirst">{note.intro}</p>{note.heroImage && <figure className="journal-hero-image">{(note.heroImage.src.startsWith('https://') || isStoredMediaSource(note.heroImage.src)) ? <img src={note.heroImage.src} alt={note.heroImage.alt} width={note.heroImage.width} height={note.heroImage.height} /> : <Image src={note.heroImage.src} alt={note.heroImage.alt} width={note.heroImage.width} height={note.heroImage.height} />}<figcaption>{note.heroImage.caption}</figcaption></figure>}{note.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}<div className="journal-source"><h2>Sources et contributions</h2>{note.sources.map((source) => <p key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></p>)}</div></main></>;
}
