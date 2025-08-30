import MemberForm from "@/components/member-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

  

export default async function NewMemberPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin"); // keep if you want sign-in required
  return (
    <div className="container mx-auto max-w-3xl py-6">
      <MemberForm />
    </div>
  );
}
