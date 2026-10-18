'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SiteContent } from '@/content/site';
import type { PortfolioProject } from '@/content/types';
import type { JournalNote } from '@/content/notes';
import { collectMediaSources } from '@/lib/mediaSources';
import type { MediaDeletionResult } from '@/lib/mediaDeletion';
import { RemoteMediaLibrary } from './RemoteMediaLibrary';
import { RemoteMediaUpload } from './RemoteMediaUpload';
import { ProfileEditor } from './ProfileEditor';
import { ProjectEditor } from './ProjectEditor';
import { NoteEditor } from './NoteEditor';
import { type UploadedAsset } from './MediaField';

interface ContentVersion { id: string; createdAt: string; action: string }
type Tab = 'profile' | 'projects' | 'notes' | 'media';

function newProject(): PortfolioProject {
  return { slug: `nouveau-projet-${Date.now()}`, number: '99', title: 'Nouveau projet', subtitle: 'Sous-titre à compléter', category: 'Catégorie à compléter', period: new Date().getFullYear().toString(), status: 'en cours', visibility: 'draft', lead: 'Résumé à compléter.', role: 'Rôle à compléter.', stack: [], metrics: [], sections: [], media: [], links: [] };
}
function newNote(): JournalNote {
  return { slug: `nouvel-article-${Date.now()}`, title: 'Nouvel article', date: new Date().toISOString().slice(0, 10), intro: 'Introduction à compléter.', visibility: 'draft', sections: [], sources: [] };
}

export function AdminEditor({ remote = false }: { remote?: boolean }) {
  const recoveryKey = remote ? 'portfolio-admin-unsaved-remote' : 'portfolio-admin-unsaved-local';
  const [content, setContent] = useState<SiteContent | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const registerMedia = useCallback((sources: string[]) => setAssets(previous => [...new Set([...previous, ...sources])].sort()), []);
  const uploadedMedia = useCallback((source: string) => { registerMedia([source]); setLibraryRevision(previous => previous + 1); }, [registerMedia]);
  const deletedMedia = useCallback((result: MediaDeletionResult) => {
    setAssets(previous => previous.filter(source => source !== result.src));
    setRevision(previous => previous === result.previousRevision ? result.revision : previous);
  }, []);
  const [tab, setTab] = useState<Tab>('profile');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedNote, setSelectedNote] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [contentResponse, mediaResponse] = await Promise.all([fetch('/api/admin/content', { cache: 'no-store' }), fetch('/api/admin/media', { cache: 'no-store' })]);
    if (!contentResponse.ok || !mediaResponse.ok) throw new Error('Connexion ou stockage indisponible. Reconnecte-toi puis réessaie.');
    const result = await contentResponse.json();
    let nextContent = (remote ? result.content : result) as SiteContent;
    let nextRevision: string | null = remote ? result.revision : null;
    let recovered = false;
    try {
      const saved = sessionStorage.getItem(recoveryKey);
      if (saved && window.confirm('Récupérer les modifications non enregistrées de cet onglet ?')) {
        const recovery = JSON.parse(saved);
        if (recovery.remote === remote) { nextContent = recovery.content; nextRevision = recovery.revision; recovered = true; }
      }
    } catch { /* Storage can be unavailable; the editor still permits JSON export. */ }
    setContent(nextContent); setRevision(nextRevision); setVersions(remote ? result.versions : []); setAssets(await mediaResponse.json() as string[]);
    if (remote) setLibraryRevision(previous => previous + 1);
    setSelectedProject(nextContent.projects[0]?.slug || ''); setSelectedNote(nextContent.notes[0]?.slug || ''); setDirty(recovered);
    if (recovered) setMessage('Modifications récupérées. Une version distante plus récente sera détectée à la sauvegarde.');
  }
  useEffect(() => { void load().catch((error) => setMessage(error.message)); }, []);
  useEffect(() => {
    if (!content) return;
    try { if (dirty) sessionStorage.setItem(recoveryKey, JSON.stringify({ content, revision, remote })); else sessionStorage.removeItem(recoveryKey); } catch { /* Export remains available if browser storage is full. */ }
    const preventExit = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', preventExit);
    return () => window.removeEventListener('beforeunload', preventExit);
  }, [content, dirty, revision, remote, recoveryKey]);
  function update(change: (draft: SiteContent) => void) {
    if (saving) return;
    setContent((previous) => { if (!previous) return previous; const draft = structuredClone(previous); change(draft); return draft; });
    setDirty(true); setMessage('Modifications non enregistrées.');
  }
  async function upload(file: File): Promise<UploadedAsset> {
    if (remote) throw new Error('Importe le fichier depuis l’onglet Médiathèque, puis sélectionne-le dans ce champ.');
    const form = new FormData(); form.append('file', file);
    const response = await fetch('/api/admin/media', { method: 'POST', body: form });
    const result = await response.json() as UploadedAsset & { error?: string };
    if (!response.ok) throw new Error(result.error || 'Import impossible.');
    setAssets((previous) => [...previous, result.src].sort());
    setMessage('Média importé. Enregistre le contenu pour conserver sa sélection.');
    return result;
  }
  async function save() {
    if (!content) return;
    setSaving(true); setMessage('Enregistrement…');
    try {
      const response = await fetch('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(remote ? { content, revision } : content) });
      if ([401, 403, 404].includes(response.status)) throw new Error('Session expirée ou accès refusé. Reconnecte-toi dans un autre onglet puis réessaie.');
      const result = await response.json() as { ok?: boolean; error?: string; backup?: string; revision?: string; versions?: ContentVersion[] };
      if (!response.ok) throw new Error(result.error || 'Enregistrement impossible.');
      if (remote) { setRevision(result.revision ?? null); setVersions(result.versions ?? []); setDirty(false); setMessage('Brouillon enregistré. Publie-le pour le rendre visible aux visiteurs.'); return; }
      setDirty(false); setMessage(`Enregistré. Sauvegarde précédente : ${result.backup}. Le site se recharge automatiquement en mode développement.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erreur inconnue.'); }
    finally { setSaving(false); }
  }
  async function changeVersion(action: 'publish' | 'restore' | 'remove-version', versionId?: string) {
    if (dirty || saving) return;
    const prompt = action === 'publish' ? 'Publier le brouillon enregistré sur cette Preview ?' : action === 'restore' ? 'Restaurer cette version dans le brouillon ? La version publique reste inchangée.' : 'Retirer définitivement cette sauvegarde de l’historique ? Exporte-la d’abord.';
    if (!window.confirm(prompt)) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, revision, versionId }) });
      if ([401, 403, 404].includes(response.status)) throw new Error('Session expirée ou accès refusé. Reconnecte-toi puis réessaie.');
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Action impossible. Reconnecte-toi ou réessaie.'); }
      const result = await response.json();
      setContent(result.content); setRevision(result.revision); setVersions(result.versions); setDirty(false);
      setMessage(action === 'publish' ? 'Publié. Recharge le portfolio pour voir cette version.' : action === 'restore' ? 'Version restaurée dans le brouillon. Vérifie l’aperçu avant de publier.' : 'Version retirée de l’historique.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action impossible.'); }
    finally { setSaving(false); }
  }
  function move(type: 'projects' | 'notes', slug: string, direction: -1 | 1) {
    update((draft) => {
      const items = draft[type];
      const currentIndex = items.findIndex((item) => item.slug === slug);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return;
      [items[currentIndex], items[targetIndex]] = [items[targetIndex], items[currentIndex]];
    });
  }
  function exportContent() {
    if (!content) return;
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `portfolio-pierre-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  if (!content) return <main className="editor-loading"><p>{message || 'Chargement de l’éditeur…'}</p><button onClick={() => void load().catch(error => setMessage(error.message))}>Réessayer</button><a href="/admin/connexion" target="_blank" rel="noopener noreferrer">Se reconnecter</a></main>;
  const project = content.projects.find((item) => item.slug === selectedProject) || content.projects[0];
  const note = content.notes.find((item) => item.slug === selectedNote) || content.notes[0];
  return <main className="editor-shell"><aside className="editor-sidebar"><a className="editor-brand" href="/">PD<span>.</span> <small>ÉDITEUR</small></a><p className="editor-sidebar-title">Portfolio de Pierre</p><nav aria-label="Sections de l’éditeur"><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>01 / Accueil & profil</button><button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>02 / Projets <span>{content.projects.length}</span></button><button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>03 / Articles <span>{content.notes.length}</span></button><button className={tab === 'media' ? 'active' : ''} onClick={() => setTab('media')}>04 / Médiathèque <span>{assets.length}</span></button></nav><div className="editor-sidebar-foot"><p>{remote ? 'Le brouillon enregistré reste privé jusqu’à publication.' : 'Édition locale. Les projets et articles « brouillon » restent cachés du site public.'}</p><a href="/" target="_blank" rel="noopener noreferrer">Ouvrir le portfolio ↗</a></div></aside><div className="editor-main"><header className="editor-topbar"><div><p className="editor-eyebrow">STUDIO / CONTENU</p><h1>{tab === 'profile' ? 'Accueil & profil' : tab === 'projects' ? 'Études de cas' : tab === 'notes' ? 'Journal' : 'Médiathèque'}</h1></div><div className="editor-top-actions">{remote && <><button disabled={dirty || saving} onClick={() => void changeVersion('publish')}>Publier</button><form method="post" action="/api/admin/preview" target="_blank"><button disabled={dirty || saving}>Aperçu du brouillon enregistré</button></form><a href="/api/admin/content?export=true" download="portfolio-backup.json">Exporter la sauvegarde</a></>}<button type="button" className="editor-quiet-button" onClick={exportContent}>Exporter JSON</button><button type="button" className="editor-save-button" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Enregistrement…' : dirty ? 'Enregistrer les changements' : 'Enregistré ✓'}</button></div></header>{remote && <p><a href="/admin/connexion" target="_blank" rel="noopener noreferrer">Se reconnecter sans fermer cet onglet ↗</a></p>}{message && <p role="status" className={`editor-message ${dirty ? 'unsaved' : ''}`}>{message}</p>}
    {remote && <details className="editor-group"><summary>Historique ({versions.length}/50) — restaurer un brouillon</summary><p>Exporte une version avant de la retirer. Une restauration ne publie pas automatiquement.</p>{versions.map(version => <p key={version.id}>{new Date(version.createdAt).toLocaleString('fr-FR')} · {version.action} <button disabled={dirty || saving} onClick={() => void changeVersion('restore', version.id)}>Restaurer</button> <a href={`/api/admin/content?versionId=${version.id}`} download={`${version.id}.json`}>Exporter</a> <button disabled={dirty || saving} onClick={() => void changeVersion('remove-version', version.id)}>Retirer</button></p>)}</details>}
    {tab === 'profile' && <ProfileEditor profile={content.profile} onChange={(profile) => update((draft) => { draft.profile = profile; })} assets={assets} onUpload={upload} />}
    {tab === 'projects' && <><div className="editor-selection"><select aria-label="Projet à modifier" value={project?.slug || ''} disabled={saving} onChange={(event) => setSelectedProject(event.target.value)}>{content.projects.map((item) => <option value={item.slug} key={item.slug}>{item.title} {item.visibility === 'draft' ? '· brouillon' : ''}</option>)}</select><button type="button" className="editor-minor-button" onClick={() => { const item = newProject(); update((draft) => { draft.projects.push(item); }); setSelectedProject(item.slug); }}>+ Nouveau projet</button></div>{project && <><div className="editor-preview-bar"><span>{project.visibility === 'draft' ? 'BROUILLON' : 'PUBLIÉ'}</span><strong>{project.title}</strong><button type="button" disabled={content.projects[0]?.slug === project.slug} onClick={() => move('projects', project.slug, -1)}>↑ Monter</button><button type="button" disabled={content.projects.at(-1)?.slug === project.slug} onClick={() => move('projects', project.slug, 1)}>↓ Descendre</button>{project.visibility !== 'draft' && <a href={`/projets/${project.slug}`} target="_blank" rel="noopener noreferrer">Voir la page ↗</a>}<button type="button" onClick={() => { if (window.confirm(`Retirer « ${project.title} » du portfolio ? Le fichier média reste conservé.`)) { update((draft) => { draft.projects = draft.projects.filter((item) => item.slug !== project.slug); }); setSelectedProject(content.projects.find((item) => item.slug !== project.slug)?.slug || ''); } }}>Retirer la fiche</button></div><ProjectEditor project={project} onChange={(next) => { update((draft) => { draft.projects = draft.projects.map((item) => item.slug === project.slug ? next : item); }); setSelectedProject(next.slug); }} assets={assets} onUpload={upload} /></>}</>}
    {tab === 'notes' && <><div className="editor-selection"><select aria-label="Article à modifier" value={note?.slug || ''} disabled={saving} onChange={(event) => setSelectedNote(event.target.value)}>{content.notes.map((item) => <option value={item.slug} key={item.slug}>{item.title} {item.visibility === 'draft' ? '· brouillon' : ''}</option>)}</select><button type="button" className="editor-minor-button" onClick={() => { const item = newNote(); update((draft) => { draft.notes.unshift(item); }); setSelectedNote(item.slug); }}>+ Nouvel article</button></div>{note && <><div className="editor-preview-bar"><span>{note.visibility === 'draft' ? 'BROUILLON' : 'PUBLIÉ'}</span><strong>{note.title}</strong><button type="button" disabled={content.notes[0]?.slug === note.slug} onClick={() => move('notes', note.slug, -1)}>↑ Monter</button><button type="button" disabled={content.notes.at(-1)?.slug === note.slug} onClick={() => move('notes', note.slug, 1)}>↓ Descendre</button>{note.visibility !== 'draft' && <a href={`/journal/${note.slug}`} target="_blank" rel="noopener noreferrer">Voir la page ↗</a>}<button type="button" onClick={() => { if (window.confirm(`Retirer l’article « ${note.title} » ?`)) { update((draft) => { draft.notes = draft.notes.filter((item) => item.slug !== note.slug); }); setSelectedNote(content.notes.find((item) => item.slug !== note.slug)?.slug || ''); } }}>Retirer l’article</button></div><NoteEditor note={note} onChange={(next) => { update((draft) => { draft.notes = draft.notes.map((item) => item.slug === note.slug ? next : item); }); setSelectedNote(next.slug); }} assets={assets} onUpload={upload} /></>}</>}
    {tab === 'media' && <section className="editor-form">{remote && <><RemoteMediaUpload onUploaded={uploadedMedia} /><RemoteMediaLibrary revision={libraryRevision} onAvailable={registerMedia} onDeleted={deletedMedia} usedSources={collectMediaSources(content)} disabled={saving} /></>}{!remote && <div className="editor-group"><h2>Importer une capture, vidéo ou PDF</h2><p>Importe ici un média puis sélectionne-le dans le profil, un projet ou un article.</p><label className="editor-upload-button">+ Choisir un fichier<input type="file" accept="image/png,image/jpeg,image/webp,image/avif,video/mp4,video/webm,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file).catch((error) => setMessage(error.message)); event.target.value = ''; }} /></label></div>}<div className="editor-group"><h2>Médias disponibles</h2><div className="editor-media-grid">{assets.filter(asset => !remote || !asset.startsWith('/media/blob/')).map((asset) => <div className="editor-media-tile" key={asset}>{/\.(png|jpe?g|webp|avif|svg)$/i.test(asset) ? <img src={asset} alt="" /> : /\.(mp4|webm)$/i.test(asset) ? <video src={asset} preload="metadata" /> : <div className="editor-pdf-tile">PDF</div>}<code>{asset}</code><button type="button" onClick={() => void navigator.clipboard.writeText(asset).then(() => setMessage('Chemin du média copié.'))}>Copier le chemin</button></div>)}</div></div></section>}
  </div></main>;
}
