import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { auth, handlers, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  callbacks: {
    signIn({ account }) {
      const ownerId = process.env.ADMIN_GITHUB_ID;
      return Boolean(ownerId && /^\d+$/.test(ownerId) && account?.provider === 'github' && account.providerAccountId === ownerId);
    },
    jwt({ token, account }) {
      if (account?.provider === 'github') token.adminGithubId = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      session.user = Object.assign(session.user ?? {}, { id: String(token.adminGithubId ?? '') });
      return session;
    },
  },
});
