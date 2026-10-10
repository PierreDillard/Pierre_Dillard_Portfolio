import Link from 'next/link';
import { siteContent } from '@/content/site';

export function SiteHeader() {
  return (
    <header className="site-header wrap">
      <Link className="brand" href="/" aria-label="Pierre Dillard, accueil">PD<span>.</span></Link>
      <nav aria-label="Navigation principale">
        <Link href="/#projets">Projets</Link>
        <Link href="/#expertise">Expertise</Link>
        <Link href="/journal">Journal</Link>
        <Link href="/#contact">Contact</Link>
        {process.env.NODE_ENV === 'development' && <Link className="header-editor" href="/admin">Éditeur ↗</Link>}
      </nav>
      <a className="header-cv" href={siteContent.profile.cvSrc} download>CV PDF ↗</a>
    </header>
  );
}
