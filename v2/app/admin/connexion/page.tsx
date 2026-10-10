import { notFound } from 'next/navigation';
import { auth, signIn, signOut } from '@/auth';
import { adminAuthenticationEnabled } from '@/lib/adminAccess';

export const dynamic = 'force-dynamic';

export default async function AdminConnectionPage() {
  if (!adminAuthenticationEnabled()) notFound();
  const session = await auth();
  const isOwner = session?.user?.id === process.env.ADMIN_GITHUB_ID;

  async function connectOwner() {
    'use server';
    if (!adminAuthenticationEnabled()) notFound();
    await signIn('github', { redirectTo: '/admin/connexion' });
  }

  async function disconnectOwner() {
    'use server';
    if (!adminAuthenticationEnabled()) notFound();
    await signOut({ redirectTo: '/admin/connexion' });
  }

  return <main className="wrap section">
    <p className="eyebrow">Administration</p>
    <h1>Connexion administrateur</h1>
    <p>{isOwner
      ? 'Tu es connecté avec le compte propriétaire.'
      : 'Connecte-toi avec ton compte GitHub pour accéder à l’administration.'}</p>
    {isOwner && <p>L’édition en ligne sera disponible après la validation de cette connexion.</p>}
    <form action={isOwner ? disconnectOwner : connectOwner}>
      <button className="button" type="submit">{isOwner ? 'Se déconnecter' : 'Se connecter avec GitHub'}</button>
    </form>
  </main>;
}
