import type { SiteContent } from './site';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedMedia = /^(\/media\/[a-zA-Z0-9/_ .-]+|https:\/\/[^\s]+)$/;
const allowedLink = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

function requiredText(value: unknown, name: string, limit = 12000): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`${name} doit contenir entre 1 et ${limit} caractères.`);
}

function textArray(value: unknown, name: string) {
  if (!Array.isArray(value) || value.length > 50) throw new Error(`${name} doit être une liste.`);
  value.forEach((item, index) => requiredText(item, `${name} ${index}`, 200));
}

function mediaPath(value: unknown, name: string) {
  requiredText(value, name, 2000);
  if (!allowedMedia.test(value)) throw new Error(`${name} doit être un média local ou une URL HTTPS.`);
}

function uniqueSlugs(items: { slug: string }[], name: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (!slugPattern.test(item.slug) || seen.has(item.slug)) throw new Error(`Slug ${name} invalide ou en double : ${item.slug}`);
    seen.add(item.slug);
  }
}

export function validateSiteContent(value: unknown): asserts value is SiteContent {
  if (!value || typeof value !== 'object') throw new Error('Contenu invalide.');
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 2) throw new Error('Version de contenu inconnue.');
  if (!data.profile || typeof data.profile !== 'object') throw new Error('Profil manquant.');
  const profile = data.profile as Record<string, unknown>;
  for (const key of ['siteTitle', 'siteDescription', 'name', 'location', 'year', 'kicker', 'heroLead', 'featuredDescription', 'footerText', 'introStatement', 'introBody', 'contactKicker', 'email']) requiredText(profile[key], key);
  for (const prefix of ['hero', 'intro', 'featured', 'other', 'journal', 'contact']) {
    const title = profile[`${prefix}Title`];
    const accent = profile[`${prefix}Accent`];
    requiredText(title, `${prefix}Title`);
    if (typeof accent !== 'string' || accent.length > 200 || (accent && !title.includes(accent))) throw new Error(`La sélection colorée de « ${prefix} » doit se trouver dans son titre.`);
  }
  textArray(profile.expertiseTags, 'Expertises');
  mediaPath(profile.portraitSrc, 'Portrait');
  mediaPath(profile.cvSrc, 'CV');
  if (!Array.isArray(data.projects) || data.projects.length > 100) throw new Error('Liste de projets invalide.');
  if (!Array.isArray(data.notes) || data.notes.length > 200) throw new Error('Liste d’articles invalide.');
  const projects = data.projects as Record<string, unknown>[];
  const notes = data.notes as Record<string, unknown>[];
  if (!projects.some((project) => project.visibility === 'published')) throw new Error('Au moins un projet doit rester publié.');
  for (const project of projects) {
    for (const key of ['slug', 'number', 'title', 'subtitle', 'category', 'period', 'lead', 'role']) requiredText(project[key], `Projet : ${key}`);
    if (!['livré', 'en cours', 'recherche'].includes(String(project.status))) throw new Error('Statut de projet invalide.');
    if (!['draft', 'published'].includes(String(project.visibility))) throw new Error('Publication de projet invalide.');
    textArray(project.stack, 'Technologies');
    if (!Array.isArray(project.sections) || !Array.isArray(project.metrics) || !Array.isArray(project.media) || !Array.isArray(project.links)) throw new Error('Sections du projet invalides.');
    if (project.visibility === 'published' && project.media.length === 0) throw new Error(`Le projet publié « ${project.title} » doit avoir au moins un média.`);
    for (const section of project.sections) { requiredText(section.heading, 'Titre de section'); requiredText(section.body, 'Texte de section'); if (section.points) textArray(section.points, 'Points'); }
    for (const metric of project.metrics) { requiredText(metric.value, 'Valeur'); requiredText(metric.label, 'Mesure'); if (metric.context) requiredText(metric.context, 'Contexte'); }
    for (const media of project.media) { mediaPath(media.src, 'Média'); requiredText(media.alt, 'Texte alternatif'); requiredText(media.caption, 'Légende'); if (!Number.isFinite(media.width) || !Number.isFinite(media.height) || media.width < 1 || media.height < 1) throw new Error('Dimensions de média invalides.'); if (media.kind && !['image', 'video'].includes(media.kind)) throw new Error('Type de média invalide.'); if (media.poster) mediaPath(media.poster, 'Affiche vidéo'); }
    for (const link of project.links) { requiredText(link.label, 'Lien'); requiredText(link.href, 'URL'); if (!allowedLink.test(link.href)) throw new Error('URL de lien invalide.'); }
  }
  for (const note of notes) {
    for (const key of ['slug', 'title', 'date', 'intro']) requiredText(note[key], `Article : ${key}`);
    if (!['draft', 'published'].includes(String(note.visibility))) throw new Error('Publication d’article invalide.');
    if (!Array.isArray(note.sections) || !Array.isArray(note.sources)) throw new Error('Sections de l’article invalides.');
    for (const section of note.sections) { requiredText(section.heading, 'Titre de section'); requiredText(section.body, 'Texte de section'); }
    for (const source of note.sources) { requiredText(source.label, 'Source'); requiredText(source.href, 'URL'); if (!allowedLink.test(source.href)) throw new Error('URL de source invalide.'); }
    if (note.heroImage) {
      if (typeof note.heroImage !== 'object') throw new Error('Image de l’article invalide.');
      const heroImage = note.heroImage as Record<string, unknown>;
      mediaPath(heroImage.src, 'Image de l’article');
      requiredText(heroImage.alt, 'Texte alternatif');
      requiredText(heroImage.caption, 'Légende');
      if (!Number.isFinite(heroImage.width) || !Number.isFinite(heroImage.height) || Number(heroImage.width) < 1 || Number(heroImage.height) < 1) throw new Error('Dimensions invalides.');
    }
  }
  uniqueSlugs(projects as { slug: string }[], 'projet');
  uniqueSlugs(notes as { slug: string }[], 'article');
}
