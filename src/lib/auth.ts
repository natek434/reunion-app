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
      // Always show the Google account chooser
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
          image: user.image ?? undefined, // DB custom avatar if set
        } as any;
      },
    }),
  ],
  callbacks: {
    /**
     * Store stable identifiers, plus keep BOTH images on the token:
     * - token.customImage  (your DB avatar)
     * - token.providerImage (Google profile picture)
     *
     * We also honor client-side useSession().update({ image, name }) when present.
     */
    async jwt({ token, user, profile, trigger, session }) {
      // On sign-in, capture core identity and images
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "MEMBER";

        // Custom image from DB (may be string or undefined/null)
        if (typeof (user as any).image !== "undefined") {
          (token as any).customImage = (user as any).image ?? null;
        }

        // Provider image (e.g., Google -> profile.picture)
        if (profile && typeof (profile as any).picture === "string") {
          (token as any).providerImage = (profile as any).picture;
        }

        if ((user as any).name) token.name = (user as any).name;
      }

      // Client requested a session.update()
      if (trigger === "update" && session) {
        if (Object.prototype.hasOwnProperty.call(session, "image")) {
          // If caller passes "", treat as clear; if they omit image entirely, do nothing
          const next = (session as any).image;
          (token as any).customImage = typeof next === "string" ? (next || null) : (token as any).customImage;
        }
        if (typeof (session as any).name !== "undefined") {
          token.name = (session as any).name || token.name;
        }
      }

      // Hardening: if we somehow missed id/role, look up by email
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, image: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          (token as any).customImage = dbUser.image ?? (token as any).customImage ?? null;
          if (dbUser.name) token.name = dbUser.name;
        }
      }

      return token;
    },

    /**
     * Build the session:
     * - session.user.image prefers customImage then providerImage (fallback)
     * - also expose both as session.user.customImage / providerImage
     * - optionally refresh customImage/name from DB by id
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token.id as string) ?? token.sub;
        (session.user as any).role = (token.role as any) ?? "MEMBER";
      }

      let custom: string | null | undefined = (token as any).customImage ?? null;
      let provider: string | null | undefined = (token as any).providerImage ?? null;

      // If you want freshest DB avatar/name each time, keep this block (costs a DB read per session fetch)
      if (session.user && ((session.user as any).id || token.sub)) {
        const userId = (session.user as any).id || token.sub!;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { image: true, name: true },
          });

          if (typeof dbUser?.image !== "undefined") {
            custom = dbUser.image; // string or null
          }
          if (dbUser?.name) session.user.name = dbUser.name;
          else if ((token as any).name && !session.user.name) session.user.name = (token as any).name;
        } catch {
          // ignore; fall back to token values
        }
      }

      // Final image used by the app
      session.user.image = custom || provider || null;

      // Also expose both so the UI can build a precise fallback chain
      (session.user as any).customImage = custom ?? null;
      (session.user as any).providerImage = provider ?? null;

      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

// If you're using the App Router route export:
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
