'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaDeletionResult } from '@/lib/mediaDeletion';
import type { LibraryMedia } from '@/lib/mediaLibrary';

const endpoint = '/api/admin/media/library';
export function RemoteMediaLibrary({ revision, onAvailable, onDeleted, usedSources, disabled }: { revision: number; onAvailable: (sources: string[]) => void; onDeleted: (result: MediaDeletionResult) => void; usedSources: string[]; disabled: boolean }) {
  const [items, setItems] = useState<LibraryMedia[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);
  async function load(nextCursor?: string) {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(endpoint + (nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ''), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Médiathèque indisponible. Reconnecte-toi ou réessaie.');
      const page = await response.json() as { items: LibraryMedia[]; cursor?: string };
      if (controller.signal.aborted) return;
      setItems(previous => [...new Map([...(nextCursor ? previous : []), ...page.items].map(item => [item.filename, item])).values()]);
      setCursor(page.cursor); onAvailable(page.items.filter(item => item.verified).map(item => item.src));
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Chargement impossible.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  useEffect(() => { void load(); return () => active.current?.abort(); }, [revision, onAvailable]);
  async function verify(item: LibraryMedia) {
    if (busy || disabled) return;
    const controller = new AbortController(); active.current = controller; setBusy(true); setMessage('Vérification du fichier…');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: item.filename }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Vérification impossible.');
      if (controller.signal.aborted) return;
      setItems(previous => previous.map(entry => entry.filename === item.filename ? { ...entry, verified: true } : entry));
      onAvailable([result.src]); setMessage('Média vérifié. Tu peux le sélectionner dans le profil, un projet ou un article.');
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Vérification impossible.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function remove(item: LibraryMedia) {
    if (busy || disabled || usedSources.includes(item.src)) return;
    if (!window.confirm(`Supprimer définitivement ${item.filename} ? Cette action est irréversible. Les références du contenu et de l’historique seront vérifiées avant suppression.`)) return;
    const controller = new AbortController(); active.current = controller; setBusy(true); setMessage('Suppression et contrôle des références…');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: item.filename, etag: item.etag }), signal: controller.signal });
      const result = await response.json();
      if (controller.signal.aborted) return;
      const deletion = response.ok ? result as MediaDeletionResult : result.deletion as MediaDeletionResult | undefined;
      if (deletion) {
        onDeleted(deletion);
        setItems(previous => deletion.removed && !deletion.cleanupPending ? previous.filter(entry => entry.filename !== item.filename) : previous.map(entry => entry.filename === item.filename ? { ...entry, retired: true, verified: false } : entry));
      }
      if (!response.ok) throw new Error(result.error || 'Suppression impossible.');
      setMessage(result.cleanupPending ? 'Fichier supprimé. Le nettoyage de sa fiche reste à terminer : réessaie la suppression.' : 'Fichier supprimé du stockage.');
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Suppression impossible.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="editor-group"><h2>Fichiers importés</h2><p>Choisis ensuite le fichier dans le champ média du profil, du projet ou de l’article. Enregistre le brouillon avant de publier. Seuls les fichiers inutilisés par le contenu et les versions conservées peuvent être supprimés.</p>
    <button type="button" disabled={busy || disabled} onClick={() => void load()}>Actualiser</button>
    {message && <p role="status">{message}</p>}{busy && <p role="status">Chargement ou vérification…</p>}
    {!busy && !items.length && !message && <p>Aucun fichier importé.</p>}
    <div className="editor-media-grid">{items.map(item => <div className="editor-media-tile" key={item.filename}>
      {item.verified ? item.kind === 'image' ? <img src={item.src} alt="Aperçu du fichier importé" loading="lazy" /> : item.kind === 'video' ? <video src={item.src} controls preload="metadata" /> : <a href={item.src}>Télécharger le PDF</a> : <p>{item.retired ? 'Suppression à terminer.' : 'Vérification nécessaire avant utilisation.'}</p>}
      <code>{item.filename}</code><small>{(item.size / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mio</small>
      {item.verified ? <button type="button" onClick={() => void navigator.clipboard.writeText(item.src).then(() => setMessage('Chemin copié.'))}>Copier le chemin</button> : !item.retired && <button type="button" disabled={busy || disabled} onClick={() => void verify(item)}>Vérifier et rendre disponible</button>}
      <button type="button" disabled={busy || disabled || usedSources.includes(item.src)} onClick={() => void remove(item)}>{item.retired ? 'Réessayer la suppression' : 'Supprimer'}</button>
      {usedSources.includes(item.src) && <small>Utilisé dans le contenu affiché. Retire sa sélection et enregistre avant de supprimer.</small>}
    </div>)}</div>{cursor && <button type="button" disabled={busy || disabled} onClick={() => void load(cursor)}>Charger plus de fichiers</button>}
  </div>;
}
