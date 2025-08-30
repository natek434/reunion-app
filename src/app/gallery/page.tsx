import { prisma } from "@/lib/db";
import Link from "next/link";
import GalleryGrid from "./_client-grid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';


function encodeCursor(d: Date, id: string) {
  return Buffer.from(`${d.toISOString()}::${id}`).toString("base64");
}

export default async function Gallery() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin"); // keep if you want sign-in required


  const items = await prisma.galleryItem.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 24 + 1,
    select: { id: true, name: true, mimeType: true, createdAt: true },
  });

  const hasMore = items.length > 24;
  if (hasMore) items.pop();

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1]!.createdAt, items[items.length - 1]!.id)
    : null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Family Gallery</h1>
        <Link href="/albums" className="btn btn-primary">My Albums</Link>
      </div>

      <GalleryGrid
        initialItems={items.map(it => ({
          id: it.id,
          name: it.name,
          mimeType: it.mimeType,
          createdAt: it.createdAt.toISOString(),
        }))}
        initialCursor={nextCursor}
      />
    </section>
  );
}
