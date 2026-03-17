import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TESTE: Redireciona TUDO para /login (exceto a própria página de login)
  if (!request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
