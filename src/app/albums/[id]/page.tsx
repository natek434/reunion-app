import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

export const metadata = { title: "Album" };
const AlbumClient = dynamic(() => import("./_client-album"))

type AlbumParams = Promise<{ id: string }>;

export default async function AlbumPage({ params }: { params: AlbumParams }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
if (!session?.user?.id) redirect("/login");
  return <AlbumClient albumId={id} />;
}
