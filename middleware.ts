import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value ||
    [...request.cookies.getAll()].find(c => 
      c.name.includes('auth-token') || c.name.includes('access-token')
    )?.value

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPublic = request.nextUrl.pathname === '/'

  if (!token && !isAuthPage && !isPublic) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
