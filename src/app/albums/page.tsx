// src/app/albums/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import NewAlbumForm from "./_client-new-form";

export const metadata = { title: "My Albums" };

export default async function AlbumsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return <div className="card p-6">Please sign in to manage albums.</div>;

  const albums = await prisma.album.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">My Albums</h1>
        <p className="text-neutral-600">Create albums from your uploads and run a fullscreen slideshow.</p>
      </div>

      <NewAlbumForm />

      {!albums.length ? (
        <div className="card p-6 text-neutral-600">No albums yet. Create your first above.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(a => (
            <Link key={a.id} href={`/albums/${a.id}`} className="card p-4 hover:shadow-md transition">
              <div className="font-semibold">{a.name}</div>
              {a._count.items} items
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
