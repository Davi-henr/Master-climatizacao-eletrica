import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isAuth = request.cookies.get('master_auth')?.value === 'true';
  const role = request.cookies.get('master_role')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!isAuth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuth && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // RBAC: Block admin routes for 'funcionario'
  const adminOnlyRoutes = ['/orcamentos', '/cadastros', '/rh', '/financeiro', '/historico'];
  if (role === 'funcionario') {
    const isTryingAdminRoute = adminOnlyRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    if (isTryingAdminRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
