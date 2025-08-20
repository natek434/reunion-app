import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

export const metadata = { title: "Family Tree Viewer" };
const TreeClient = dynamic(() => import("./tree-client"))

export default async function TreePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin"); // keep if you want sign-in required
  return <TreeClient />;
}
