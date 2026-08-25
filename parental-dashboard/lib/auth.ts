import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

/**
 * ENV-based single parent account auth.
 *
 * Required env vars:
 *   - PARENT_EMAIL           e.g. parent@example.com
 *   - PARENT_PASSWORD_HASH   bcrypt hash of parent password
 *   - NEXTAUTH_SECRET        random secret (openssl rand -base64 32)
 *   - NEXTAUTH_URL           full base URL (http://localhost:3000 in dev)
 *
 * Session strategy: JWT, 24h max age.
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const parentEmail = process.env.PARENT_EMAIL
        const parentHash = process.env.PARENT_PASSWORD_HASH

        if (!parentEmail || !parentHash) {
          console.error('[auth] PARENT_EMAIL or PARENT_PASSWORD_HASH not set')
          return null
        }

        // Case-insensitive email compare
        if (credentials.email.trim().toLowerCase() !== parentEmail.trim().toLowerCase()) {
          return null
        }

        const ok = await bcrypt.compare(credentials.password, parentHash)
        if (!ok) return null

        return {
          id: parentEmail,
          email: parentEmail,
          name: 'Parent',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // session.user.id = process.env.PARENT_EMAIL
        ;(session.user as { id?: string }).id = (token.id as string) ?? process.env.PARENT_EMAIL
        session.user.email = (token.email as string) ?? process.env.PARENT_EMAIL ?? null
      }
      return session
    },
  },
}
