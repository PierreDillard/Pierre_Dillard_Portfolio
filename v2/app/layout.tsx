import type { Metadata } from 'next';
import './globals.css';
import { siteContent } from '@/content/site';

export const metadata: Metadata = {
  title: siteContent.profile.siteTitle,
  description: siteContent.profile.siteDescription,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
