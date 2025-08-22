"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteLocalFile } from "@/lib/localstorage";
import { redirect } from "next/navigation";

export async function deleteUploadAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing id");

  const item = await prisma.galleryItem.findUnique({ where: { id } });
  if (!item) throw new Error("Not found");
  if (item.userId !== (session.user as any).id) throw new Error("Forbidden");

  try { await deleteLocalFile(item.fileName); } catch {}
  await prisma.galleryItem.delete({ where: { id } });

  // Refresh page data
  redirect("/me");
}
