import NextAuth, { type NextAuthOptions, type Session, type Account } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import { consumePendingLinks } from '@/lib/linkStore';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid', 'email', 'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, account, profile, trigger }: {
      token: JWT;
      account: Account | null;
      profile?: Record<string, unknown>;
      trigger?: string;
    }) {
      // Primeiro login — salva dados da conta primária
      if (account && profile) {
        token.primaryEmail  = profile.email as string;
        token.primaryName   = profile.name  as string;
        token.primaryAvatar = profile.picture as string;
        token.accessToken   = account.access_token;
        token.refreshToken  = account.refresh_token;
        token.expiresAt     = account.expires_at;
        if (!token.linkedAccounts) token.linkedAccounts = [];
      }

      // Consome contas vinculadas pendentes da store server-side
      const primaryEmail = token.primaryEmail as string | undefined;
      if (primaryEmail) {
        const pending = consumePendingLinks(primaryEmail);
        if (pending.length > 0) {
          const existing = (token.linkedAccounts as LinkedAccount[]) ?? [];
          const existingEmails = new Set(existing.map((a) => a.email));
          const novas = pending.filter((p) => !existingEmails.has(p.email));
          token.linkedAccounts = [...existing, ...novas];
        }
      }

      // Renova access_token principal se expirado
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() / 1000 > expiresAt - 300) {
        token = await refreshAccessToken(token);
      }

      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      session.user = {
        ...session.user,
        email: token.primaryEmail as string,
        name:  token.primaryName  as string,
        image: token.primaryAvatar as string,
      };
      // Apenas emails — tokens ficam no JWT server-side
      (session as Session & { linkedEmails: string[] }).linkedEmails =
        ((token.linkedAccounts as LinkedAccount[]) ?? []).map((a) => a.email);

      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export interface LinkedAccount {
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: token.refreshToken as string,
      }).toString(),
    });
    const refreshed = await res.json();
    if (!res.ok) throw refreshed;
    return {
      ...token,
      accessToken:  refreshed.access_token,
      expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (err) {
    console.error('Erro ao renovar token Google:', err);
    return { ...token, error: 'RefreshTokenError' };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
