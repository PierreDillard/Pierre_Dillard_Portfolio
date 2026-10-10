'use client';

export function EditorField({ label, value, onChange, multiline = false, hint }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string }) {
  return <label className="editor-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}{hint && <small>{hint}</small>}</label>;
}

export function EditorGroup({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return <section className="editor-group"><div className="editor-group-heading"><h3>{title}</h3>{onAdd && <button type="button" className="editor-minor-button" onClick={onAdd}>+ Ajouter</button>}</div>{children}</section>;
}
