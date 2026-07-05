import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('SignIn Callback Debug:', { user, account, profile, email, credentials });
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { isActive: true }
        });
        if (dbUser && dbUser.isActive === false) {
          console.warn(`Sign-in rejected for inactive user: ${user.email}`);
          return false;
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.role = user.role;
        session.user.id = user.id;
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', // Error code passed in query string as ?error=
  },
  session: {
    strategy: "database", // Use DB sessions
  },
  events: {
    async signIn({ user }) {
      if (user.email === 'khanhdev4@gmail.com') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' }
        })
      }
    }
  },
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata)
    }
  }
}
