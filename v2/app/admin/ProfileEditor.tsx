'use client';

import type { SiteProfile } from '@/content/site';
import { EditorField, EditorGroup } from './EditorField';
import { AccentTitleField } from './AccentTitleField';
import { MediaField, type UploadedAsset } from './MediaField';

const textFields: { key: keyof SiteProfile; label: string; multiline?: boolean }[] = [
  { key: 'name', label: 'Nom' }, { key: 'location', label: 'Ville' }, { key: 'year', label: 'Année' },
  { key: 'kicker', label: 'Métier / accroche courte' }, { key: 'heroLead', label: 'Présentation sous le titre', multiline: true },
  { key: 'introStatement', label: 'Phrase principale', multiline: true }, { key: 'introBody', label: 'Texte explicatif', multiline: true },
  { key: 'featuredDescription', label: 'Introduction aux projets', multiline: true },
  { key: 'contactKicker', label: 'Accroche contact', multiline: true }, { key: 'email', label: 'Adresse e-mail' }, { key: 'footerText', label: 'Pied de page' },
  { key: 'siteTitle', label: 'Titre SEO' }, { key: 'siteDescription', label: 'Description SEO', multiline: true },
];

const titleFields = [
  { title: 'heroTitle', accent: 'heroAccent', label: 'Grand titre' },
  { title: 'introTitle', accent: 'introAccent', label: 'Titre du positionnement' },
  { title: 'featuredTitle', accent: 'featuredAccent', label: 'Titre des projets' },
  { title: 'otherTitle', accent: 'otherAccent', label: 'Titre des autres études' },
  { title: 'journalTitle', accent: 'journalAccent', label: 'Titre du journal' },
  { title: 'contactTitle', accent: 'contactAccent', label: 'Titre du contact' },
] as const;

export function ProfileEditor({ profile, onChange, assets, onUpload }: { profile: SiteProfile; onChange: (profile: SiteProfile) => void; assets: string[]; onUpload: (file: File) => Promise<UploadedAsset> }) {
  function change(key: keyof SiteProfile, value: string) { onChange({ ...profile, [key]: value }); }
  return <div className="editor-form"><EditorGroup title="Titres et couleur"><p>Sélectionne les mots à colorer dans un titre, puis clique sur « Colorer le texte sélectionné ». La sélection peut se trouver au début, au milieu ou à la fin.</p>{titleFields.map((field) => <AccentTitleField key={field.title} label={field.label} title={profile[field.title]} accent={profile[field.accent]} onChange={(title, accent) => onChange({ ...profile, [field.title]: title, [field.accent]: accent })} />)}</EditorGroup><EditorGroup title="Portrait et CV"><MediaField label="Portrait" src={profile.portraitSrc} assets={assets} accept="image" onChange={(asset) => change('portraitSrc', asset.src)} onUpload={onUpload} /><MediaField label="CV PDF" src={profile.cvSrc} assets={assets} accept="pdf" onChange={(asset) => change('cvSrc', asset.src)} onUpload={onUpload} /></EditorGroup><EditorGroup title="Autres textes du site">{textFields.map((field) => <EditorField key={field.key} label={field.label} value={String(profile[field.key])} onChange={(value) => change(field.key, value)} multiline={field.multiline} />)}<EditorField label="Expertises (une par ligne)" value={profile.expertiseTags.join('\n')} onChange={(value) => onChange({ ...profile, expertiseTags: value.split('\n').map((tag) => tag.trim()).filter(Boolean) })} multiline /></EditorGroup></div>;
}
