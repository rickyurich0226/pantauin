import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { rateLimit, RATE_LIMITS } from './ratelimit'
import { verifyTotpToken, decryptTotpSecret } from './totp'
import { verifyRecaptcha } from './recaptcha'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: 'select_account' } },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
        totpToken: { type: 'text' },       // kode 6 digit dari Google Authenticator, opsional
        recaptchaToken: { type: 'text' },  // token reCAPTCHA v3 dari client, opsional (fail-open jika belum dikonfigurasi)
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        const ip = (req as any)?.headers?.['x-forwarded-for'] ?? 'unknown'

        const rl = rateLimit({ key: `login:${ip}:${email}`, ...RATE_LIMITS.LOGIN })
        if (!rl.allowed) return null

        // reCAPTCHA v3: fail-open by design jika belum dikonfigurasi (lihat lib/recaptcha.ts).
        // Tidak memblokir login di sini, hanya dicatat — supaya tidak mengunci akses
        // sebelum admin sempat isi Site/Secret Key di Super Admin.
        const recaptchaResult = await verifyRecaptcha(credentials.recaptchaToken ?? '', 'login')
        if (!recaptchaResult.success && !recaptchaResult.skipped) {
          console.warn('[Auth] reCAPTCHA gagal untuk', email, ':', recaptchaResult.reason)
          return null
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) return null
        if (!(await bcrypt.compare(credentials.password, user.password))) return null

        // 2FA: jika user mengaktifkan TOTP, wajib sertakan kode 6 digit yang valid.
        // Login normal tanpa kode akan ditolak di sini (NextAuth authorize return null
        // => "CredentialsSignin" error generik, tidak membocorkan info bahwa akun punya 2FA).
        const has2FA = (user as any).twoFactorEnabled && (user as any).twoFactorSecret
        if (has2FA) {
          const token = credentials.totpToken?.trim()
          if (!token) return null // client perlu menangani ini sebagai "butuh kode 2FA"
          const decryptedSecret = decryptTotpSecret((user as any).twoFactorSecret)
          const validTotp = verifyTotpToken(token, decryptedSecret)
          if (!validTotp) {
            try {
              await prisma.auditLog.create({
                data: { userId: user.id, userEmail: user.email, action: '2FA_LOGIN_FAILED', ipAddress: String(ip).split(',')[0].trim() },
              })
            } catch {}
            return null
          }
        }

        const cleanIp = String(ip).split(',')[0].trim()
        try {
          await Promise.all([
            prisma.auditLog.create({
              data: { userId: user.id, userEmail: user.email, action: 'USER_LOGIN', ipAddress: cleanIp },
            }),
            (prisma as any).user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date(), lastLoginIp: cleanIp },
            }),
          ])
        } catch {}

        return { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existing = await prisma.user.findUnique({ where: { email: user.email! } })
          if (existing) {
            if (!existing.isActive) return false
            await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } })
            user.id = existing.id
            return true
          }
          // User baru via Google - buat akun dengan flag needsProfile
          const created = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split('@')[0],
              password: '',
              plan: 'FREE',
              role: 'USER',
              isActive: true,
              needsProfile: true,
            }
          })
          user.id = created.id
          return true
        } catch { return false }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; token.plan = (user as any).plan }
      if (token.id) {
        try {
          const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { plan: true, role: true, isActive: true, planExpiresAt: true } })
          if (u) { token.plan = u.plan; token.role = u.role; token.planExpiresAt = u.planExpiresAt; (token as any).needsProfile = (u as any).needsProfile; if (!u.isActive) return {} }
        } catch {}
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).plan = token.plan
        ;(session.user as any).planExpiresAt = token.planExpiresAt
        ;(session.user as any).needsProfile = (token as any).needsProfile
      }
      return session
    },
  },
}
