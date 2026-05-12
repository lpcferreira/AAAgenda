/**
 * POST /api/auth/link-account
 *
 * Fluxo para adicionar uma conta Google adicional:
 * 1. Front-end chama este endpoint
 * 2. Endpoint redireciona para o OAuth do Google com prompt=select_account
 * 3. Google retorna code para /api/auth/link-account/callback
 * 4. Callback troca o code por tokens e salva na sessão JWT
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/auth/link-account/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    access_type:   'offline',
    prompt:        'select_account consent',  // força escolha de conta
    state:         'link',                    // identificador do fluxo
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
