import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const ACCESS_TOKEN_KEY = 'bm_access_token';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  const isAuthenticated = !!accessToken;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Authenticated users away from login
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated users to login
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
