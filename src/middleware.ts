import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// In-memory rate limiter (per edge instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const key = ip
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (entry.count >= maxRequests) return false // blocked

  entry.count++
  return true // allowed
}

function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any
    const p = req.nextUrl.pathname
    const ip = getIP(req)

    // Role-based access
    if (p.startsWith('/superadmin') && token?.role !== 'SUPER_ADMIN')
      return NextResponse.redirect(new URL('/dashboard?error=forbidden', req.url))
    if (p.startsWith('/admin') && !['ADMIN','SUPER_ADMIN'].includes(token?.role))
      return NextResponse.redirect(new URL('/dashboard?error=forbidden', req.url))

    // Cron: secret check only, skip rate limit
    if (p.startsWith('/api/cron')) {
      const secret = req.headers.get('x-cron-secret')
      if (secret !== process.env.CRON_SECRET)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.next()
    }

    // Rate limit: login & register — 5 req/menit
    if (p === '/api/auth/signin' || p === '/api/auth/callback/credentials' || p === '/api/register') {
      if (!rateLimit(ip + ':auth', 5, 60_000)) {
        return NextResponse.json(
          { error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' },
          { status: 429 }
        )
      }
    }

    // Rate limit: API umum — 60 req/menit
    if (p.startsWith('/api/')) {
      if (!rateLimit(ip + ':api', 60, 60_000)) {
        return NextResponse.json(
          { error: 'Terlalu banyak request. Coba lagi sebentar.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const p = req.nextUrl.pathname
        const publicPaths = ['/','/login','/register','/forgot-password','/reset-password','/syarat-dan-ketentuan','/kebijakan-privasi','/faq','/pusat-bantuan','/about','/sitemap.xml','/robots.txt','/cara-kerja','/keamanan','/blog']
        const publicPrefixes = ['/fitur/','/blog/']

        const publicApi = ['/api/auth','/api/midtrans/webhook','/api/webhooks','/api/health','/api/superadmin/content','/api/cron']
        if (publicPaths.includes(p)) return true
        if (publicPrefixes.some(x => p.startsWith(x))) return true
        if (p.startsWith('/blog')) return true
        if (publicApi.some(x => p.startsWith(x))) return true
        if (p.startsWith('/_next') || p.match(/\.(png|jpg|svg|ico|css|js|webp|woff2?|html)$/) || p.startsWith('/google')) return true
        return !!token
      },
    },
  }
)

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp).*)'] }
