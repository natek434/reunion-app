// lib/authorization.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

export async function requireUser(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export function isAdmin(session: Session) {
  return session.user?.role === "ADMIN";
}

export function assertOwnerOrAdmin(session: Session, ownerId: string) {
  if (!isAdmin(session) && session.user?.id !== ownerId) {
    throw new Error("Forbidden");
  }
}
