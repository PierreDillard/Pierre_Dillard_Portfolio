'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadPresigned } from '@vercel/blob/client';

const uploadEndpoint = '/api/admin/media/upload';
interface UploadConfiguration { maximumSizeInBytes: number; contentTypes: string[] }
interface UploadResult { pathname: string; size: number; contentType: string; sha256: string }
async function readUploadResponse(response: Response) {
  if ([401, 403, 404].includes(response.status)) throw new Error('Session expirée ou imports non activés sur cette Preview.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Import impossible.');
  return result;
}
export function RemoteMediaUpload() {
  const [configuration, setConfiguration] = useState<UploadConfiguration | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'verifying'>('idle');
  const [message, setMessage] = useState('Chargement des limites d’import…');
  const [result, setResult] = useState<UploadResult | null>(null);
  const mounted = useRef(false);
  const activeUpload = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void fetch(uploadEndpoint, { cache: 'no-store', signal: controller.signal }).then(readUploadResponse).then((value: UploadConfiguration) => {
      if (!controller.signal.aborted) { setConfiguration(value); setMessage(''); }
    }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Configuration indisponible.'); });
    return () => { mounted.current = false; controller.abort(); activeUpload.current?.abort(); };
  }, []);
  async function importFile(file?: File) {
    if (!file || !configuration || activeUpload.current) return;
    setResult(null); setMessage(''); setProgress(0);
    if (!configuration.contentTypes.includes(file.type) || file.size < 1 || file.size > configuration.maximumSizeInBytes) {
      setMessage('Format non autorisé, fichier vide ou taille supérieure à la limite affichée.'); return;
    }
    const controller = new AbortController();
    activeUpload.current = controller; setPhase('uploading');
    try {
      const authorization = await readUploadResponse(await fetch(uploadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ action: 'prepare', name: file.name, contentType: file.type, size: file.size }) }));
      await uploadPresigned(authorization.pathname, file, {
        access: 'private', contentType: file.type, handleUploadUrl: uploadEndpoint, clientPayload: authorization.ticket,
        multipart: false, abortSignal: controller.signal, onUploadProgress: event => { if (!controller.signal.aborted) setProgress(Math.round(event.percentage)); },
      });
      controller.signal.throwIfAborted(); setPhase('verifying');
      const verified = await readUploadResponse(await fetch(uploadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ action: 'verify', ticket: authorization.ticket }) }));
      if (!controller.signal.aborted) { setResult(verified); setMessage('Transfert terminé et fichier vérifié. Il reste privé et n’est pas encore disponible dans le contenu.'); }
    } catch (error) {
      if (mounted.current) setMessage(controller.signal.aborted ? 'Import annulé. Un transfert déjà terminé peut avoir laissé un fichier privé ; aucun contenu n’a été modifié.' : error instanceof Error ? error.message : 'Import impossible.');
    } finally { if (activeUpload.current === controller) { activeUpload.current = null; if (mounted.current) setPhase('idle'); } }
  }
  const busy = phase !== 'idle';
  return <div className="editor-group">
    <h2>Importer un fichier privé</h2>
    <p>Les fichiers importés restent privés. Leur sélection dans le portfolio et leur publication ne sont pas encore disponibles.</p>
    {configuration && <p>Limite par fichier : {(configuration.maximumSizeInBytes / 1024 / 1024).toLocaleString('fr-FR')} Mio. PNG, JPEG, WebP, AVIF, MP4, WebM ou PDF.</p>}
    <label className="editor-upload-button">+ Choisir un fichier<input type="file" aria-label="Importer un fichier privé" disabled={!configuration || busy} accept={configuration?.contentTypes.join(',')} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importFile(file); }} /></label>
    {busy && <><p role="status">{phase === 'uploading' ? `Transfert : ${progress} %` : 'Vérification du fichier stocké…'}</p><progress value={progress} max={100} aria-label="Progression du transfert" /><button type="button" onClick={() => activeUpload.current?.abort()}>Annuler</button></>}
    {message && <p role="status">{message}</p>}
    {result && <dl><dt>Fichier privé vérifié</dt><dd><code>{result.pathname}</code></dd><dt>Taille relue</dt><dd>{result.size.toLocaleString('fr-FR')} octets</dd><dt>Empreinte SHA-256</dt><dd style={{ overflowWrap: 'anywhere' }}><code>{result.sha256}</code></dd></dl>}
  </div>;
}
