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
    }),
    Credentials({
      name: "Credentials",
      credentials: { email: {label: "email", type: "text"}, password: {label: "password", type: "password"} },
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
    /**
     * JWT runs at sign-in and on subsequent requests.
     * We keep stable identifiers (id/role) and stash the provider picture as a fallback.
     * We also listen for client-side useSession().update({ name, image }) to reflect instant changes.
     */
    async jwt({ token, user, trigger, session }) {
      // On first login, copy from user (DB-backed via adapter)
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "MEMBER";
        // Stash provider/initial picture as fallback for later
        token.picture = (user as any).image ?? (token as any).picture ?? null;
        if ((user as any).name) token.name = (user as any).name;
      }

      // Support instant UI updates via useSession().update
      if (trigger === "update" && session) {
        if (typeof (session as any).image !== "undefined") {
          token.picture = (session as any).image || null;
        }
        if (typeof (session as any).name !== "undefined") {
          token.name = (session as any).name || token.name;
        }
      }

      // Hardening: if we somehow missed id/role (e.g. config change), look up by email
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, image: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.picture = dbUser.image ?? (token as any).picture ?? null;
          if (dbUser.name) token.name = dbUser.name;
        }
      }

      return token;
    },

    /**
     * Session runs whenever /api/auth/session is fetched.
     * We prefer the DB avatar every time (and respect null = cleared),
     * falling back to the provider picture only if the DB field is truly unavailable.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id as string) ?? token.sub;
        (session.user as any).role = (token.role as any) ?? "MEMBER";
      }

      if (session.user && ((session.user as any).id || token.sub)) {
        const userId = (session.user as any).id || token.sub!;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true, name: true },
          });

          const providerPicture = (token as any).picture ?? null;

          // IMPORTANT: Prefer DB avatar, and if DB is explicitly null (cleared),
          // do NOT fall back to provider — show initials in the UI.
          if (typeof dbUser?.image !== "undefined") {
            (session.user as any).image = dbUser.image; // can be string or null
          } else {
            // Only when DB field is truly unavailable, use provider fallback
            (session.user as any).image = providerPicture ?? (session.user as any).image ?? null;
          }

          // Optionally prefer DB name if present
          if (dbUser?.name) session.user.name = dbUser.name;
          else if ((token as any).name && !session.user.name) session.user.name = (token as any).name;
        } catch {
          // If DB temporarily unavailable, fall back to provider picture
          (session.user as any).image = (token as any).picture ?? (session.user as any).image ?? null;
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

// If you use the NextAuth route in /app/api/auth/[...nextauth]/route.ts,
// you likely do: export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
