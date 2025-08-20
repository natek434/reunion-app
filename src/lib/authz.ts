import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust if your path differs

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const err = new Error("Unauthorized") as any;
    err.status = 401;
    throw err;
  }
  return session;
}

export const isAdmin = (s: any) => s?.user?.role === "ADMIN";
export const canEditPerson = (s: any, createdById: string) =>
  isAdmin(s) || s?.user?.id === createdById;
