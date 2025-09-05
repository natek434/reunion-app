import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UserRole = "ADMIN" | "EDITOR" | "MEMBER";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const e = new Error("Unauthorized");
    (e as any).status = 401;
    throw e;
  }
  const { id, role } = session.user as { id: string; role?: UserRole };
  return { userId: id, role: (role ?? "MEMBER") as UserRole };
}

export function isAdminish(role: UserRole) {
  return role === "ADMIN" || role === "EDITOR";
}

export async function assertPersonOwnerOrAdmin(personId: string, userId: string, role: UserRole) {
  if (isAdminish(role)) return;
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { createdById: true, deletedAt: true } });
  if (!p || p.deletedAt) {
    const e = new Error("Person not found");
    (e as any).status = 404;
    throw e;
  }
  if (p.createdById !== userId) {
    const e = new Error("Forbidden");
    (e as any).status = 403;
    throw e;
  }
}

export async function assertBothOwnedOrAdmin(aId: string, bId: string, userId: string, role: UserRole) {
  if (isAdminish(role)) return;
  const [a, b] = await Promise.all([
    prisma.person.findUnique({ where: { id: aId }, select: { createdById: true, deletedAt: true } }),
    prisma.person.findUnique({ where: { id: bId }, select: { createdById: true, deletedAt: true } }),
  ]);
  if (!a || a.deletedAt || !b || b.deletedAt) {
    const e = new Error("Person not found");
    (e as any).status = 404;
    throw e;
  }
  if (a.createdById !== userId || b.createdById !== userId) {
    const e = new Error("Forbidden");
    (e as any).status = 403;
    throw e;
  }
}

