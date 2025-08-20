import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

export const metadata = { title: "Family (Admin)" };
const FamilyClient = dynamic(() => import("./family-client")); // keep as-is

export default async function FamilyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");               // still sign-in protected
  const role = (session.user as any)?.role;
  if (role !== "ADMIN") redirect("/tree");               // non-admin → tree

  return (
    <div className="grid gap-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Admin</h1>
          <p className="text-neutral-600 text-sm">Add members, link parents & spouses, manage locks/deletes.</p>
        </div>
        <Link href="/tree" className="btn">View Tree</Link>  {/* ← button to tree */}
      </div>
      <FamilyClient />
    </div>
  );
}
