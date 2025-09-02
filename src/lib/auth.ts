import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "select_account" } },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email || "");
        const password = String(creds?.password || "");

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email!,
          name: user.name ?? undefined,
          role: user.role,
          image: user.image ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, profile, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "MEMBER";
        if (typeof (user as any).image !== "undefined") {
          (token as any).customImage = (user as any).image ?? null;
        }
        if (profile && typeof (profile as any).picture === "string") {
          (token as any).providerImage = (profile as any).picture;
        }
        if ((user as any).name) token.name = (user as any).name;
      }

      if (trigger === "update" && session) {
        if (Object.prototype.hasOwnProperty.call(session, "image")) {
          const next = (session as any).image;
          (token as any).customImage =
            typeof next === "string" ? (next || null) : (token as any).customImage;
        }
        if (typeof (session as any).name !== "undefined") {
          token.name = (session as any).name || token.name;
        }
      }

      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, image: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          (token as any).customImage =
            dbUser.image ?? (token as any).customImage ?? null;
          if (dbUser.name) token.name = dbUser.name;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id as string) ?? token.sub;
        (session.user as any).role = (token.role as any) ?? "MEMBER";
      }

      let custom: string | null | undefined = (token as any).customImage ?? null;
      let provider: string | null | undefined = (token as any).providerImage ?? null;

      if (session.user && ((session.user as any).id || token.sub)) {
        const userId = (session.user as any).id || token.sub!;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true, name: true },
          });
          if (typeof dbUser?.image !== "undefined") custom = dbUser.image;
          if (dbUser?.name) session.user.name = dbUser.name;
          else if ((token as any).name && !session.user.name)
            session.user.name = (token as any).name;
        } catch {
          // ignore
        }
      }

      session.user.image = custom || provider || null;
      (session.user as any).customImage = custom ?? null;
      (session.user as any).providerImage = provider ?? null;

      return session;
    },

    // ✅ Normalize where users land after sign-in for both credentials and OAuth
    redirect({ url, baseUrl }) {
      // allow same-origin URLs
      try {
        const u = new URL(url, baseUrl);
        if (u.origin === baseUrl) return u.href;
      } catch {
        /* noop */
      }
      // default landing page
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

// App Router helpers (v5)
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
