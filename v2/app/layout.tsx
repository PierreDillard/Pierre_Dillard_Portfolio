import type { Metadata } from 'next';
import './globals.css';
import { readRenderedContent } from '@/lib/renderedContent';

export async function generateMetadata(): Promise<Metadata> {
  const content = await readRenderedContent();
  return { title: content.profile.siteTitle, description: content.profile.siteDescription };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
