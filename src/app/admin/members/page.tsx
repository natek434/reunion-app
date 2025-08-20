import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Admin Members Page
 *
 * This page exposes CRUD functionality for Person records (the reunion
 * "members") as well as simple tools to link and unlink parent-child
 * relationships. Only users with the ADMIN role may access this page.
 *
 * Forms throughout this component post to the server actions defined
 * below. Each action checks the current session for an admin role
 * before performing mutations with Prisma. After changes, the page
 * revalidates itself to show updated data immediately.
 */

/** Helper to require an admin role. */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

/**
 * Create a new member.
 */
async function createMember(formData: FormData) {
  "use server";
  await requireAdmin();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const gender = String(formData.get("gender") || "UNKNOWN");
  const birth = formData.get("birthDate") ? String(formData.get("birthDate")) : null;
  const death = formData.get("deathDate") ? String(formData.get("deathDate")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : undefined;
  await prisma.person.create({
    data: {
      firstName,
      lastName,
      gender,
      birthDate: birth ? new Date(birth) : undefined,
      deathDate: death ? new Date(death) : undefined,
      notes,
    },
  });
  revalidatePath("/admin/members");
}

/**
 * Update an existing member.
 */
async function updateMember(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const gender = String(formData.get("gender") || "UNKNOWN");
  const birth = formData.get("birthDate") ? String(formData.get("birthDate")) : null;
  const death = formData.get("deathDate") ? String(formData.get("deathDate")) : null;
  const notes = formData.get("notes") ? String(formData.get("notes")) : undefined;
  await prisma.person.update({
    where: { id },
    data: {
      firstName,
      lastName,
      gender,
      birthDate: birth ? new Date(birth) : undefined,
      deathDate: death ? new Date(death) : undefined,
      notes,
    },
  });
  revalidatePath("/admin/members");
}

/**
 * Soft-delete a member.
 *
 * Sets the deletedAt timestamp so that the record persists but is
 * hidden from most queries. Use GET requests to remove the user from
 * public views.
 */
async function deleteMember(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") || "");
  await prisma.person.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/members");
}

/**
 * Toggle the locked status of a member.
 *
 * The form must include a hidden `id` and `nextLocked` value ("true" or
 * "false").
 */
async function toggleLock(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const next = String(formData.get("nextLocked") || "false").toLowerCase() === "true";
  await prisma.person.update({ where: { id }, data: { locked: next } });
  revalidatePath("/admin/members");
}

/**
 * Link a parent and child.
 */
async function linkParent(formData: FormData) {
  "use server";
  await requireAdmin();
  const parentId = String(formData.get("parentId") || "");
  const childId = String(formData.get("childId") || "");
  const role = String(formData.get("role") || "MOTHER");
  const kind = String(formData.get("kind") || "BIOLOGICAL");
  // Create the relationship. If constraints are violated, Prisma will throw.
  await prisma.parentChild.create({
    data: { parentId, childId, role, kind },
  });
  revalidatePath("/admin/members");
}

/**
 * Unlink a parent and child.
 */
async function unlinkParent(formData: FormData) {
  "use server";
  await requireAdmin();
  const parentId = String(formData.get("parentId") || "");
  const childId = String(formData.get("childId") || "");
  const kind = String(formData.get("kind") || "BIOLOGICAL");
  await prisma.parentChild.deleteMany({
    where: { parentId, childId, kind },
  });
  revalidatePath("/admin/members");
}

export default async function AdminMembersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/signin");
  }
  if ((session.user).role !== "ADMIN") {
    redirect("/");
  }
  // fetch all undeleted persons
  const persons = await prisma.person.findMany({
    where: { deletedAt: null },
    orderBy: { lastName: "asc" },
  });
  // Options for select elements
  const genderOptions = ["UNKNOWN", "MALE", "FEMALE", "OTHER"];
  const roleOptions = ["MOTHER", "FATHER"];
  const kindOptions = ["BIOLOGICAL", "WHANGAI"];
  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Admin: Members</h1>
      {/* List existing members */}
      {persons.map(person => (
        <div key={person.id} className="border rounded p-4 space-y-2">
          <h2 className="text-lg font-semibold">{person.firstName} {person.lastName}</h2>
          {/* Update form */}
          <form action={updateMember} className="space-y-1">
            <input type="hidden" name="id" value={person.id} />
            <label className="block">
              <span>First Name:</span>
              <input
                name="firstName"
                defaultValue={person.firstName}
                className="border px-2 py-1 w-full"
                required
              />
            </label>
            <label className="block">
              <span>Last Name:</span>
              <input
                name="lastName"
                defaultValue={person.lastName}
                className="border px-2 py-1 w-full"
                required
              />
            </label>
            <label className="block">
              <span>Gender:</span>
              <select name="gender" defaultValue={person.gender} className="border px-2 py-1 w-full">
                {genderOptions.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span>Birth Date:</span>
              <input
                type="date"
                name="birthDate"
                defaultValue={person.birthDate ? person.birthDate.toISOString().slice(0, 10) : ""}
                className="border px-2 py-1 w-full"
              />
            </label>
            <label className="block">
              <span>Death Date:</span>
              <input
                type="date"
                name="deathDate"
                defaultValue={person.deathDate ? person.deathDate.toISOString().slice(0, 10) : ""}
                className="border px-2 py-1 w-full"
              />
            </label>
            <label className="block">
              <span>Notes:</span>
              <textarea
                name="notes"
                defaultValue={person.notes ?? ""}
                className="border px-2 py-1 w-full"
                rows={2}
              />
            </label>
            <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white mt-2">
              Save Member
            </button>
          </form>
          {/* Lock/unlock form */}
          <form action={toggleLock} className="mt-1">
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="nextLocked" value={person.locked ? "false" : "true"} />
            <button type="submit" className="px-3 py-1 rounded bg-yellow-600 text-white">
              {person.locked ? "Unlock" : "Lock"}
            </button>
          </form>
          {/* Delete form */}
          <form action={deleteMember} className="mt-1">
            <input type="hidden" name="id" value={person.id} />
            <button type="submit" className="px-3 py-1 rounded bg-red-600 text-white">
              Delete Member
            </button>
          </form>
        </div>
      ))}
      {/* Create a new member */}
      <div className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Add New Member</h2>
        <form action={createMember} className="space-y-1">
          <label className="block">
            <span>First Name:</span>
            <input name="firstName" className="border px-2 py-1 w-full" required />
          </label>
          <label className="block">
            <span>Last Name:</span>
            <input name="lastName" className="border px-2 py-1 w-full" required />
          </label>
          <label className="block">
            <span>Gender:</span>
            <select name="gender" defaultValue="UNKNOWN" className="border px-2 py-1 w-full">
              {genderOptions.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Birth Date:</span>
            <input type="date" name="birthDate" className="border px-2 py-1 w-full" />
          </label>
          <label className="block">
            <span>Death Date:</span>
            <input type="date" name="deathDate" className="border px-2 py-1 w-full" />
          </label>
          <label className="block">
            <span>Notes:</span>
            <textarea name="notes" className="border px-2 py-1 w-full" rows={2} />
          </label>
          <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white mt-2">
            Create Member
          </button>
        </form>
      </div>
      {/* Relationship tools */}
      <div className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Manage Relationships</h2>
        {/* Link parent/child */}
        <form action={linkParent} className="space-y-1">
          <h3 className="font-medium">Link Parent & Child</h3>
          <label className="block">
            <span>Parent:</span>
            <select name="parentId" className="border px-2 py-1 w-full" required>
              <option value="">Select…</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Child:</span>
            <select name="childId" className="border px-2 py-1 w-full" required>
              <option value="">Select…</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Role:</span>
            <select name="role" defaultValue="MOTHER" className="border px-2 py-1 w-full">
              {roleOptions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Kind:</span>
            <select name="kind" defaultValue="BIOLOGICAL" className="border px-2 py-1 w-full">
              {kindOptions.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white mt-2">
            Link
          </button>
        </form>
        {/* Unlink parent/child */}
        <form action={unlinkParent} className="space-y-1 mt-4">
          <h3 className="font-medium">Unlink Parent & Child</h3>
          <label className="block">
            <span>Parent:</span>
            <select name="parentId" className="border px-2 py-1 w-full" required>
              <option value="">Select…</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Child:</span>
            <select name="childId" className="border px-2 py-1 w-full" required>
              <option value="">Select…</option>
              {persons.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span>Kind:</span>
            <select name="kind" defaultValue="BIOLOGICAL" className="border px-2 py-1 w-full">
              {kindOptions.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="px-3 py-1 rounded bg-red-600 text-white mt-2">
            Unlink
          </button>
        </form>
      </div>
    </div>
  );
}