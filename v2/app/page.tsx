import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { MediaFigure } from '@/components/MediaFigure';
import { AccentText } from '@/components/AccentText';
import { readRenderedContent } from '@/lib/renderedContent';

export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const siteContent = await readRenderedContent();
  const projects = siteContent.projects.filter(project => project.visibility !== 'draft');
  const notes = siteContent.notes.filter(note => note.visibility !== 'draft');
  const featuredProject = projects[0];
  const { profile } = siteContent;
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap hero-inner">
            <div className="eyebrow hero-eyebrow">{`PORTFOLIO / ${profile.name.toUpperCase()} / ${profile.year}`}</div>
            <div className="hero-grid">
              <div>
                <p className="kicker">{profile.kicker}</p>
                <h1 id="hero-title"><AccentText title={profile.heroTitle} accent={profile.heroAccent} /></h1>
                <p className="hero-lead">{profile.heroLead}</p>
                <div className="hero-actions"><Link className="button button-light" href={`/projets/${featuredProject.slug}`}>Explorer {featuredProject.title} <span>↗</span></Link><a className="plain-link" href={profile.cvSrc} download>Télécharger mon CV ↓</a></div>
              </div>
              <div className="portrait">{profile.portraitSrc.startsWith('https://') ? <img src={profile.portraitSrc} alt={`Portrait de ${profile.name}`} width={2618} height={2070} /> : <Image src={profile.portraitSrc} alt={`Portrait de ${profile.name}`} width={2618} height={2070} priority />}<span>{`${profile.name.toUpperCase()} · ${profile.location.toUpperCase()}`}</span></div>
            </div>
            <div className="hero-footer"><span>VIDÉO · MONITORING · GPAC · REACT</span><span>FRANCE / EUROPE</span></div>
          </div>
        </section>
        <section className="intro wrap section" id="expertise"><div className="section-index"><span>01 / POSITIONNEMENT</span><i /></div><div className="intro-grid"><h2><AccentText title={profile.introTitle} accent={profile.introAccent} /></h2><div><p className="statement">{profile.introStatement}</p><p>{profile.introBody}</p><div className="expertise-tags">{profile.expertiseTags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div></section>
        <section className="featured section" id="projets"><div className="wrap"><div className="section-index"><span>02 / TRAVAIL SÉLECTIONNÉ</span><i /><span>2024 — AUJOURD’HUI</span></div><div className="section-heading"><h2><AccentText title={profile.featuredTitle} accent={profile.featuredAccent} /></h2><p>{profile.featuredDescription}</p></div><article className="featured-project"><MediaFigure media={featuredProject.media[0]} /><div className="featured-content"><div><p className="kicker">{featuredProject.number} / {featuredProject.category}</p><h3>{featuredProject.title}<span>.</span></h3></div><div><p>{featuredProject.lead}</p><div className="metric-row">{featuredProject.metrics.slice(0, 2).map((metric) => <div key={metric.label}><b>{metric.value}</b><span>{metric.label}</span></div>)}</div><Link className="underlined-link" href={`/projets/${featuredProject.slug}`}>Lire l’étude de cas complète ↗</Link></div></div></article></div></section>
        <section className="horizon section"><div className="wrap"><div className="section-index"><span>03 / AUTRES ÉTUDES DE CAS</span><i /></div><h2><AccentText title={profile.otherTitle} accent={profile.otherAccent} /></h2><div className="project-grid">{projects.slice(1).map((project) => <Link className="project-card" href={`/projets/${project.slug}`} key={project.slug}><div className="project-card-image">{!project.media[0] ? <p>Média à ajouter au brouillon.</p> : project.media[0].kind === 'video' ? <video src={project.media[0].src} poster={project.media[0].poster} preload="metadata" aria-label={project.media[0].alt} /> : project.media[0].src.startsWith('https://') ? <img src={project.media[0].src} alt={project.media[0].alt} width={project.media[0].width} height={project.media[0].height} /> : <Image src={project.media[0].src} alt={project.media[0].alt} width={project.media[0].width} height={project.media[0].height} />}</div><div className="project-card-top"><span>{project.number} / {project.category}</span><span>{project.status}</span></div><h3>{project.title}</h3><p>{project.lead}</p><span className="project-card-link">Lire l’étude de cas ↗</span></Link>)}</div></div></section>
        <section className="journal-teaser section"><div className="wrap"><div className="section-index"><span>04 / JOURNAL</span><i /></div><div className="journal-teaser-row"><div><p className="kicker">NOTES DE TERRAIN</p><h2><AccentText title={profile.journalTitle} accent={profile.journalAccent} /></h2></div><div className="journal-teaser-action">{notes[0] && <Link className="underlined-link" href={`/journal/${notes[0].slug}`}>Lire : {notes[0].title} ↗</Link>}<Link className="journal-all-link" href="/journal">Tout le journal →</Link></div></div></div></section>
        <section className="contact section" id="contact"><div className="wrap"><div className="section-index"><span>05 / CONTACT</span><i /></div><p className="contact-intro">{profile.contactKicker}</p><h2><AccentText title={profile.contactTitle} accent={profile.contactAccent} /></h2><a href={`mailto:${profile.email}`}>{profile.email} ↗</a></div></section>
      </main>
      <footer className="site-footer"><div className="wrap"><span>{profile.footerText}</span><a href="https://github.com/PierreDillard" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></footer>
    </>
  );
}
