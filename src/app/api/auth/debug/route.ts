import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }
  const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return NextResponse.json({
    primaryEmail:   jwt?.primaryEmail,
    hasAccessToken: !!jwt?.accessToken,
    linkedAccounts: ((jwt?.linkedAccounts as Array<{email: string; accessToken: string}>) ?? [])
      .map(a => ({ email: a.email, hasToken: !!a.accessToken })),
  });
}
