'use client';

import { useRef } from 'react';
import { AccentText } from '@/components/AccentText';

export function AccentTitleField({ label, title, accent, onChange }: { label: string; title: string; accent: string; onChange: (title: string, accent: string) => void }) {
  const input = useRef<HTMLTextAreaElement>(null);

  function colorSelection() {
    const element = input.current;
    if (!element) return;
    const selection = title.slice(element.selectionStart, element.selectionEnd).trim();
    if (selection) onChange(title, selection);
  }

  return <div className="editor-accent-field">
    <label className="editor-field"><span>{label}</span><textarea ref={input} rows={2} value={title} onChange={(event) => { const nextTitle = event.target.value; onChange(nextTitle, nextTitle.includes(accent) ? accent : ''); }} /></label>
    <div className="editor-accent-actions"><button type="button" className="editor-minor-button" onClick={colorSelection}>Colorer le texte sélectionné</button><button type="button" className="editor-quiet-button" onClick={() => onChange(title, '')} disabled={!accent}>Retirer la couleur</button><span>{accent ? `Sélection : « ${accent} »` : 'Aucune partie colorée'}</span></div>
    <p className="editor-accent-preview" aria-label={`Aperçu : ${title}`}><AccentText title={title} accent={accent} /></p>
  </div>;
}
