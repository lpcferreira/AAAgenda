import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import { savePendingLink } from '@/lib/linkStore';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
  }

  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/agenda?error=link_cancelled`);
  }

  // Troca code por tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${process.env.NEXTAUTH_URL}/api/auth/link-account/callback`,
      grant_type:    'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/agenda?error=link_failed`);
  }

  const tokens = await tokenRes.json();

  // Busca perfil da conta vinculada
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();

  // Salva na store server-side — será consumido pelo jwt() callback
  savePendingLink(session.user.email, {
    email:        profile.email,
    displayName:  profile.name ?? profile.email,
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token ?? '',
    expiresAt:    Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
  });

  // Força refresh da sessão via redirect para /api/auth/session
  // O parâmetro ?update=1 sinaliza para a página que deve chamar update()
  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/agenda?linked=${encodeURIComponent(profile.email)}&update=1`
  );
}
