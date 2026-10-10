import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { AdminEditor } from './AdminEditor';
import { adminModeEnabled, adminPageAllowed } from '@/lib/adminAccess';
import { signOut } from '@/auth';
import './admin.css';

export default async function AdminPage() {
  if (!adminModeEnabled()) notFound();
  if (!(await adminPageAllowed())) redirect('/api/auth/signin?callbackUrl=%2Fadmin');
  return <>
    {process.env.ADMIN_REQUIRE_AUTH === 'true' && <form className="editor-session" action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}><button type="submit">Se déconnecter</button></form>}
    <AdminEditor />
  </>;
}
