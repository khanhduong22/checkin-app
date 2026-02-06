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
    async session({ session, user }) {
      if (session.user) {
        // @ts-ignore // Attach role to session
        session.user.role = user.role;
        // @ts-ignore
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
  }
}
