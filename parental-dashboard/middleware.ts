import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Protects parent-facing pages and read-only APIs.
 *
 * Protected (require parent JWT):
 *   - /                          (incident feed)
 *   - /insights/*
 *   - /pair
 *   - GET  /api/violations       (list reads by children)
 *   - GET  /api/insights
 *   - POST /api/pairing/redeem   (parent-authenticated; parent_id is
 *                                 derived from session, never the body)
 *
 * Public (always):
 *   - /login
 *   - /api/auth/*                (NextAuth endpoints)
 *   - /api/pairing/generate      (device calls to get a code; unauthenticated
 *                                 by design. TODO: add IP-based rate limit
 *                                 to blunt code-space enumeration.)
 *   - POST /api/violations       (device → server ingest, unauthenticated by design)
 *   - /privacy, /terms
 *   - Static assets (_next, favicon, images)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  // Always-public paths
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/api/pairing/generate'
  ) {
    return NextResponse.next()
  }

  // /api/dev/* — dev/demo seeder. Public-with-token; NOT protected by NextAuth.
  // The route handler itself enforces `x-seed-token` and 404s in prod unless
  // ALLOW_SEED=true. Middleware just needs to get out of the way.
  if (pathname.startsWith('/api/dev/')) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_SEED !== 'true'
    ) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }
    return NextResponse.next()
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
    (pathname.startsWith('/api/parent/') && method === 'GET') ||
    (pathname === '/api/pairing/redeem' && method === 'POST')

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
