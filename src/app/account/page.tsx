import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";
import LinkToPerson from "./link-to-person";
import dynamic from "next/dynamic";

export const metadata = { title: "Account" };

// Avoid SSR for the big client form (optional but nice)
const MemberForm = dynamic(() => import("@/components/member-form"))

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/account");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
      person: { select: { id: true, displayName: true } }, // 👈 add this
    },
  });

  if (!user) redirect("/signin?callbackUrl=/account");

  const hasPassword = !!user.passwordHash;
  const providers = user.accounts.map(a => a.provider);

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* LEFT CARD */}
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-neutral-500 mt-1">Manage your profile and sign-in options.</p>

        <ProfileClient
          initialName={user.name ?? ""}
          email={user.email ?? ""}
          initialImage={user.image ?? ""}
          hasPassword={hasPassword}
          providers={providers}
        />

        <section className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Link to my person</h2>
          {/* 👇 pass current linked person (if any) */}
          <LinkToPerson current={user.person ?? null} />
        </section>

        {/* OPTIONAL: create more members right on Account */}
        <section className="mt-6 border-t pt-6">
          <h2 className="text-lg font-semibold mb-2">Create another member</h2>
          <p className="text-sm text-neutral-500 mb-3">
            Only you (creator) or an Admin can edit/delete or change relationships.
          </p>
          <MemberForm />
        </section>
      </div>

      {/* RIGHT CARD */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">Connected accounts</h2>
        <ul className="text-neutral-600 space-y-1">
          {providers.length === 0 && <li>None</li>}
          {providers.map(p => <li key={p} className="capitalize">{p}</li>)}
        </ul>
        <p className="text-sm text-neutral-500 mt-4">
          Google users manage email & photo in Google; you can still set a custom avatar here.
        </p>
      </div>
    </section>
  );
}
