import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN = 'bm_access_token';
const RM_TOKEN = 'rm_access_token';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get(ADMIN_TOKEN)?.value;
  const rmToken = request.cookies.get(RM_TOKEN)?.value;

  // Restaurant routes
  if (pathname.startsWith('/restaurant')) {
    if (!rmToken && !pathname.startsWith('/restaurant/login')) {
      return NextResponse.redirect(new URL('/restaurant/login', request.url));
    }
    if (rmToken && pathname === '/restaurant/login') {
      return NextResponse.redirect(new URL('/restaurant', request.url));
    }
    return NextResponse.next();
  }

  // Admin routes
  if (!adminToken && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (adminToken && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|sounds|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wav)$).*)',
  ],
};
