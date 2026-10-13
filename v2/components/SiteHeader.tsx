import Link from 'next/link';
import { readRenderedContent } from '@/lib/renderedContent';
import { draftMode } from 'next/headers';
import { adminAuthenticationEnabled, adminPageAllowed } from '@/lib/adminAccess';

export async function SiteHeader() {
  const siteContent = await readRenderedContent();
  const showConnection = adminAuthenticationEnabled();
  const owner = showConnection && await adminPageAllowed();
  const preview = owner && (await draftMode()).isEnabled;
  return (
    <><header className="site-header wrap">
      <Link className="brand" href="/" aria-label="Pierre Dillard, accueil">PD<span>.</span></Link>
      <nav aria-label="Navigation principale">
        <Link href="/#projets">Projets</Link>
        <Link href="/#expertise">Expertise</Link>
        <Link href="/journal">Journal</Link>
        <Link href="/#contact">Contact</Link>
        {(process.env.NODE_ENV === 'development' || showConnection) && <Link className="header-editor" href={owner || process.env.NODE_ENV === 'development' ? '/admin' : '/admin/connexion'}>{owner || process.env.NODE_ENV === 'development' ? 'Éditeur ↗' : 'Connexion'}</Link>}
      </nav>
      <a className="header-cv" href={siteContent.profile.cvSrc} download>CV PDF ↗</a>
    </header>{preview && <aside className="wrap"><strong>Aperçu privé du brouillon enregistré</strong><form action="/api/admin/preview?exit=true" method="post"><button>Quitter l’aperçu</button></form></aside>}</>
  );
}
