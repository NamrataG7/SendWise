import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Protects parent-facing pages and read-only APIs.
 *
 * Protected:
 *   - /                    (incident feed)
 *   - /insights/*
 *   - /pair
 *   - GET /api/violations  (list reads by children)
 *   - GET /api/insights
 *
 * Public (always):
 *   - /login
 *   - /api/auth/*                (NextAuth endpoints)
 *   - /api/pairing/redeem        (parent redeems, but code+parent_id in body)
 *   - /api/pairing/generate      (device calls to get a code)
 *   - POST /api/violations       (device → server ingest, unauthenticated by design)
 *   - /privacy, /terms
 *   - Static assets (_next, favicon, images)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  // Always-public paths
  const publicPrefixes = [
    '/login',
    '/api/auth',
    '/api/pairing/redeem',
    '/api/pairing/generate',
    '/privacy',
    '/terms',
    '/_next',
    '/favicon',
  ]
  if (publicPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p))) {
    // /api/auth prefix and static: allow
    if (
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname === '/login' ||
      pathname === '/privacy' ||
      pathname === '/terms' ||
      pathname === '/api/pairing/redeem' ||
      pathname === '/api/pairing/generate'
    ) {
      return NextResponse.next()
    }
  }

  // POST /api/violations — device ingest, unauthenticated by design
  if (pathname.startsWith('/api/violations') && method === 'POST') {
    return NextResponse.next()
  }

  // Everything else that we care about needs a token
  const isProtectedPage =
    pathname === '/' ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/pair')

  const isProtectedApi =
    (pathname.startsWith('/api/violations') && method === 'GET') ||
    (pathname.startsWith('/api/insights') && method === 'GET') ||
    (pathname.startsWith('/api/parent/') && method === 'GET')

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (token) {
    return NextResponse.next()
  }

  // Unauthenticated
  if (isProtectedApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Run on all paths except Next internals & static files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
