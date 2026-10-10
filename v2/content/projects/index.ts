import { siteContent } from '../site';

export const projects = siteContent.projects.filter((project) => project.visibility !== 'draft');

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
