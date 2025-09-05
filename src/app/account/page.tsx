// src/app/account/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";
import LinkToPerson from "@/components/family/link-account-person"
import Link from "next/link";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/account");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
      person: { select: { id: true, displayName: true } },
    },
  });

  if (!user) redirect("/signin?callbackUrl=/account");

  const hasPassword = !!user.passwordHash;
  const providers = user.accounts.map(a => a.provider);
  const isAdmin = user.role === "ADMIN"; // change to (user.role === "ADMIN" || user.role === "EDITOR") if editors count

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* LEFT CARD */}
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1">Manage your profile and sign-in options.</p>

        <ProfileClient
          initialName={user.name ?? ""}
          email={user.email ?? ""}
          initialImage={user.image ?? ""}
          hasPassword={hasPassword}
          providers={providers}
        />

        {/* Keep: link account -> existing person (no creation here) */}
        <section className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Link to my person</h2>
          <LinkToPerson current={user.person ?? null} />
        </section>

        {/* New: CTA to the user’s family dashboard (list + visualize + edit relationships) */}
        <section className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Manage my family</h2>
          <p className="text-sm mb-3">
            View members you created and edit relationships. (Admins create members on the Admin page.)
          </p>
          <Link href="/account/family" className="btn btn-primary">
            Open My Family
          </Link>
        </section>

        {/* Optional: admin shortcuts (still no creation here) */}
        {isAdmin && (
          <section className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-2">Admin tools</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin" className="btn btn-outline">Admin Dashboard</Link>
              <Link href="/admin/members" className="btn btn-outline">Manage Members</Link>
              <Link href="/admin/relationships" className="btn btn-outline">Manage Relationships</Link>
            </div>
          </section>
        )}
      </div>

      {/* RIGHT CARD */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">Connected accounts</h2>
        <ul className="space-y-1">
          {providers.length === 0 && <li>None</li>}
          {providers.map(p => (
            <li key={p} className="capitalize">{p}</li>
          ))}
        </ul>
        <p className="text-sm mt-4">
          Google users manage email & photo in Google; you can still set a custom avatar here.
        </p>
      </div>
    </section>
  );
}
