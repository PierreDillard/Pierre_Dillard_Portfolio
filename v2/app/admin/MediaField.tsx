'use client';

import { useState } from 'react';

export interface UploadedAsset { src: string; kind: 'image' | 'video' | 'pdf'; }

export function MediaField({ label, src, assets, onChange, onUpload, accept }: { label: string; src: string; assets: string[]; onChange: (asset: UploadedAsset) => void; onUpload: (file: File) => Promise<UploadedAsset>; accept?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError('');
    try { onChange(await onUpload(file)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import impossible.'); }
    finally { setUploading(false); }
  }
  const filtered = assets.filter((asset) => accept === 'image' ? /\.(png|jpe?g|webp|avif|svg)$/i.test(asset) : accept === 'pdf' ? /\.pdf$/i.test(asset) : /\.(png|jpe?g|webp|avif|svg|mp4|webm)$/i.test(asset));
  return <div className="editor-media-field"><label className="editor-field"><span>{label}</span><input value={src} onChange={(event) => onChange({ src: event.target.value, kind: /\.(mp4|webm)(\?|$)/i.test(event.target.value) ? 'video' : 'image' })} placeholder="/media/… ou URL HTTPS" /></label><div className="editor-media-actions"><select value="" onChange={(event) => { if (event.target.value) onChange({ src: event.target.value, kind: /\.(mp4|webm)$/i.test(event.target.value) ? 'video' : /\.pdf$/i.test(event.target.value) ? 'pdf' : 'image' }); }}><option value="">Choisir un média existant</option>{filtered.map((asset) => <option value={asset} key={asset}>{asset.split('/').pop()}</option>)}</select><label className="editor-upload-button">{uploading ? 'Import en cours…' : '+ Importer un fichier'}<input type="file" accept={accept === 'pdf' ? '.pdf' : accept === 'image' ? 'image/png,image/jpeg,image/webp,image/avif' : 'image/png,image/jpeg,image/webp,image/avif,video/mp4,video/webm'} disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label></div>{error && <p className="editor-error">{error}</p>}{src && (/\.(png|jpe?g|webp|avif|svg)(\?|$)/i.test(src) ? <img className="editor-media-preview" src={src} alt="Aperçu du média sélectionné" /> : /\.(mp4|webm)(\?|$)/i.test(src) ? <video className="editor-media-preview" src={src} controls preload="metadata" /> : <a href={src} target="_blank" rel="noopener noreferrer">Ouvrir le fichier ↗</a>)}</div>;
}
