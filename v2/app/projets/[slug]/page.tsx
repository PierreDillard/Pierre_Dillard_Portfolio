import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { MediaFigure } from '@/components/MediaFigure';
import { readRenderedContent } from '@/lib/renderedContent';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const siteContent = await readRenderedContent();
  const project = siteContent.projects.find(project => project.slug === slug && project.visibility !== 'draft');
  if (!project) notFound();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="case-hero"><div className="wrap"><Link className="back-link" href="/#projets">← Retour aux projets</Link><p className="kicker">{project.category} · {project.period}</p><h1>{project.title}<span>.</span></h1><p className="case-subtitle">{project.subtitle}</p><div className="case-meta"><span>RÔLE / {project.role}</span><span>STATUT / {project.status}</span></div></div></section>
        <section className="case-media wrap"><MediaFigure media={project.media[0]} /></section>
        <section className="case-body wrap"><aside><span>01 / CONTEXTE & MÉTHODE</span><div className="case-stack">{project.stack.map((item) => <span key={item}>{item}</span>)}</div><div className="case-links">{project.links.map((link) => link.href.startsWith('/') ? <Link key={link.href} href={link.href}>{link.label} ↗</Link> : <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div></aside><div className="case-article"><p className="case-lead">{project.lead}</p>{project.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p>{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</section>)}<div className="case-metrics">{project.metrics.map((metric) => <div key={metric.label}><b>{metric.value}</b><span>{metric.label}</span>{metric.context && <p>{metric.context}</p>}</div>)}</div></div></section>
        {project.media.slice(1).map((media) => <section className="case-secondary-media wrap" key={media.src}><MediaFigure media={media} /></section>)}
        <section className="case-end wrap"><Link href="/#projets">← Tous les projets</Link><a href={`mailto:${siteContent.profile.email}`}>Discuter d’un projet ↗</a></section>
      </main>
      <footer className="site-footer"><div className="wrap"><span>{siteContent.profile.footerText}</span><a href="https://github.com/PierreDillard" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></footer>
    </>
  );
}
