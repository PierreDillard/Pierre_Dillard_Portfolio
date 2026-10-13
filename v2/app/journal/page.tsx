import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { readRenderedContent } from '@/lib/renderedContent';

export const dynamic = 'force-dynamic';
export default async function JournalPage() {
  const content = await readRenderedContent();
  const notes = content.notes.filter(note => note.visibility !== 'draft');
  return <><SiteHeader /><main className="journal-page wrap"><p className="kicker">JOURNAL / VIDÉO · GPAC · INTERFACES</p><h1 className="journal-title">Notes de terrain.</h1><p className="case-lead">Des explications courtes, reliées au code et à la documentation.</p><div className="journal-list">{notes.map((note) => <article className="journal-item" key={note.slug}><time dateTime={note.date}>{note.date}</time><div><h2>{note.title}</h2><p>{note.intro}</p></div><Link href={`/journal/${note.slug}`}>Lire ↗</Link></article>)}</div></main></>;
}
