/**
 * GET /api/auth/token
 * Expõe o accessToken do Google apenas para o próprio usuário autenticado.
 * Usado pelo agente no frontend para criar eventos em nome do usuário.
 * Não expõe refresh_token nem outros segredos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json({ error: 'Token não disponível' }, { status: 401 });
  }

  // Retorna apenas o accessToken — nunca o refreshToken
  return NextResponse.json(
    { accessToken: token.accessToken },
    {
      headers: {
        // Não cachear — token muda com refresh
        'Cache-Control': 'no-store',
      },
    }
  );
}
