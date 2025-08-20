import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ClientUploads from "./_client-uploads";

export default async function MePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">My uploads</h1>
        <p>Please sign in to see your uploads.</p>
      </div>
    );
  }

  // Keep it serializable: only send the fields you render on the client
  const raw = await prisma.galleryItem.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, mimeType: true },
  });

  const items = raw.map((r) => ({
    id: r.id,
    name: r.name,
    mimeType: r.mimeType,
  }));

  return (
    <section className="grid gap-6">
      <ClientUploads initial={items} />
    </section>
  );
}
