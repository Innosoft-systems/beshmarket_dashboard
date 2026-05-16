import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = 'bm_access_token';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get(ADMIN_TOKEN)?.value;

  const isLoginPath = pathname.startsWith('/login') || pathname.startsWith('/restaurant/login');

  if (!adminToken && !isLoginPath) {
    const loginUrl = new URL(pathname.startsWith('/restaurant') ? '/restaurant/login' : '/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (adminToken && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (adminToken && pathname.startsWith('/restaurant/login')) {
    return NextResponse.redirect(new URL('/restaurant', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|sounds|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wav)$).*)',
  ],
};
