export type ProjectStatus = 'livré' | 'en cours' | 'recherche';

export interface ProjectMedia {
  kind?: 'image' | 'video';
  poster?: string;
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export interface ProjectSection {
  heading: string;
  body: string;
  points?: string[];
}

export interface ProjectMetric {
  value: string;
  label: string;
  context?: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface PortfolioProject {
  visibility?: 'draft' | 'published';
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  period: string;
  status: ProjectStatus;
  lead: string;
  role: string;
  stack: string[];
  metrics: ProjectMetric[];
  sections: ProjectSection[];
  media: ProjectMedia[];
  links: ProjectLink[];
}
