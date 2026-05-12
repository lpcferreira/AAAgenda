import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Rotas protegidas: exige sessão válida
    const protectedPaths = ['/agenda', '/guia', '/glossario'];
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

    if (isProtected && !token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Bloco extra: em produção, exige email com domínio autorizado
    // Adicione outros domínios conforme necessário
    const allowedDomains = [
      'exd.ind.br',
      'due.net.br',
      'ibr50mais.org.br',
      'gmail.com', // para contas pessoais autorizadas
    ];

    if (isProtected && token?.email) {
      const emailDomain = (token.email as string).split('@')[1];
      const isAllowed = allowedDomains.includes(emailDomain);

      if (!isAllowed) {
        return NextResponse.redirect(new URL('/login?error=unauthorized_domain', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Deixa o middleware rodar mesmo sem token (para fazer o redirect)
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    '/agenda/:path*',
    '/guia/:path*',
    '/glossario/:path*',
    '/api/agent/:path*',
    '/api/calendar/:path*',
    '/api/auth/token',
  ],
};
