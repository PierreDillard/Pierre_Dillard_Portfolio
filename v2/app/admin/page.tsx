import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { AdminEditor } from './AdminEditor';
import { adminModeEnabled, adminPageAllowed } from '@/lib/adminAccess';
import { signOut } from '@/auth';
import './admin.css';
import { remoteContentEnabled } from '@/lib/contentStorage';
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!adminModeEnabled()) notFound();
  if (!(await adminPageAllowed())) redirect('/admin/connexion');
  return <>
    {(remoteContentEnabled() || process.env.ADMIN_REQUIRE_AUTH === 'true') && <form className="editor-session" action={async () => { 'use server'; if (!(await adminPageAllowed())) notFound(); await signOut({ redirectTo: '/' }); }}><button type="submit">Se déconnecter</button></form>}
    <AdminEditor remote={remoteContentEnabled()} />
  </>;
}
