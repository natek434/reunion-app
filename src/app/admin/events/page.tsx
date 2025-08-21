import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ConfirmButton from "@/components/confirm-button";

/* -------------------------- helpers & validation -------------------------- */

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user)?.role;
  if (!session?.user || role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

function getString(fd: FormData, key: string, { trim = true, fallback = "" } = {}) {
  const v = fd.get(key);
  const s = typeof v === "string" ? v : "";
  return trim ? s.trim() : s || fallback;
}

function getOptionalString(fd: FormData, key: string, { trim = true } = {}) {
  const v = fd.get(key);
  if (v == null) return undefined;
  const s = typeof v === "string" ? (trim ? v.trim() : v) : "";
  return s === "" ? undefined : s;
}

function parseDateOrThrow(isoLike: string, fieldLabel: string) {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${fieldLabel} date/time.`);
  return d;
}

function assertEndAfterStart(start: Date, end: Date) {
  if (end.getTime() < start.getTime()) {
    throw new Error("End time must be after start time.");
  }
}

/** Convert a Date to a value usable by <input type="datetime-local"> in *local time*. */
function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/* ------------------------------- server actions ------------------------------- */

/** Create Event */
async function createEvent(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const title = getString(formData, "title");
    const timezone = getString(formData, "timezone", { fallback: "Pacific/Auckland" });
    const location = getString(formData, "location", { trim: true });
    const address = getOptionalString(formData, "address");
    const description = getOptionalString(formData, "description");

    const start = parseDateOrThrow(getString(formData, "start", { trim: false }), "start");
    const end = parseDateOrThrow(getString(formData, "end", { trim: false }), "end");
    assertEndAfterStart(start, end);

    await prisma.event.create({
      data: { title, start, end, timezone, location, address, description },
    });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("createEvent failed:", err);
    throw err;
  }
}

/** Update Event */
async function updateEvent(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const id = getString(formData, "id");
    if (!id) throw new Error("Missing event id.");

    const title = getString(formData, "title");
    const timezone = getString(formData, "timezone", { fallback: "Pacific/Auckland" });
    const location = getString(formData, "location", { trim: true });
    const address = getOptionalString(formData, "address");
    const description = getOptionalString(formData, "description");

    const start = parseDateOrThrow(getString(formData, "start", { trim: false }), "start");
    const end = parseDateOrThrow(getString(formData, "end", { trim: false }), "end");
    assertEndAfterStart(start, end);

    await prisma.event.update({
      where: { id },
      data: { title, start, end, timezone, location, address, description },
    });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("updateEvent failed:", err);
    throw err;
  }
}

/** Delete Event */
async function deleteEvent(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const id = getString(formData, "id");
    if (!id) throw new Error("Missing event id.");

    await prisma.event.delete({ where: { id } });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("deleteEvent failed:", err);
    throw err;
  }
}

/** Create Itinerary Item */
async function createItem(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const eventId = getString(formData, "eventId");
    if (!eventId) throw new Error("Missing event id for itinerary item.");

    const title = getString(formData, "title");
    const location = getOptionalString(formData, "location");
    const notes = getOptionalString(formData, "notes");
    const category = getOptionalString(formData, "category");

    const start = parseDateOrThrow(getString(formData, "start", { trim: false }), "start");

    const endRaw = getOptionalString(formData, "end", { trim: false });
    const end = endRaw ? parseDateOrThrow(endRaw, "end") : undefined;
    if (end) assertEndAfterStart(start, end);

    await prisma.itineraryItem.create({
      data: { eventId, title, start, end, location, notes, category },
    });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("createItem failed:", err);
    throw err;
  }
}

/** Update Itinerary Item */
async function updateItem(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const id = getString(formData, "id");
    if (!id) throw new Error("Missing item id.");

    const title = getString(formData, "title");
    const location = getOptionalString(formData, "location");
    const notes = getOptionalString(formData, "notes");
    const category = getOptionalString(formData, "category");

    const start = parseDateOrThrow(getString(formData, "start", { trim: false }), "start");

    const endRaw = getOptionalString(formData, "end", { trim: false });
    const end = endRaw ? parseDateOrThrow(endRaw, "end") : undefined;
    if (end) assertEndAfterStart(start, end);

    await prisma.itineraryItem.update({
      where: { id },
      data: { title, start, end, location, notes, category },
    });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("updateItem failed:", err);
    throw err;
  }
}

/** Delete Itinerary Item */
async function deleteItem(formData: FormData) {
  "use server";
  await requireAdmin();
  try {
    const id = getString(formData, "id");
    if (!id) throw new Error("Missing item id.");

    await prisma.itineraryItem.delete({ where: { id } });

    revalidatePath("/event");
    revalidatePath("/admin/events");
  } catch (err) {
    console.error("deleteItem failed:", err);
    throw err;
  }
}

/* ---------------------------------- page UI ---------------------------------- */

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/signin");
  if ((session.user)?.role !== "ADMIN") redirect("/");

  const events = await prisma.event.findMany({
    include: { items: { orderBy: { start: "asc" } } },
    orderBy: { start: "asc" },
  });

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Admin: Events</h1>

      {events.map((event) => (
        <div key={event.id} className="border rounded p-4 space-y-4">
          <h2 className="text-xl font-semibold">Edit Event</h2>

          {/* Update Event */}
          <form action={updateEvent} className="space-y-2">
            <input type="hidden" name="id" value={event.id} />

            <label className="block">
              <span>Title:</span>
              <input
                name="title"
                defaultValue={event.title}
                className="border px-2 py-1 w-full"
                required
              />
            </label>

            <label className="block">
              <span>Start:</span>
              <input
                type="datetime-local"
                name="start"
                defaultValue={toDatetimeLocalValue(new Date(event.start))}
                className="border px-2 py-1 w-full"
                required
              />
            </label>

            <label className="block">
              <span>End:</span>
              <input
                type="datetime-local"
                name="end"
                defaultValue={toDatetimeLocalValue(new Date(event.end))}
                className="border px-2 py-1 w-full"
                required
              />
            </label>

            <label className="block">
              <span>Timezone:</span>
              <input
                name="timezone"
                defaultValue={event.timezone}
                className="border px-2 py-1 w-full"
              />
            </label>

            <label className="block">
              <span>Location:</span>
              <input
                name="location"
                defaultValue={event.location}
                className="border px-2 py-1 w-full"
              />
            </label>

            <label className="block">
              <span>Address:</span>
              <input
                name="address"
                defaultValue={event.address ?? ""}
                className="border px-2 py-1 w-full"
              />
            </label>

            <label className="block">
              <span>Description:</span>
              <textarea
                name="description"
                defaultValue={event.description ?? ""}
                className="border px-2 py-1 w-full"
                rows={3}
              />
            </label>

            <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
              Save Event
            </button>
          </form>

          {/* Delete Event */}
          <form action={deleteEvent} className="mt-2">
            <input type="hidden" name="id" value={event.id} />
           <ConfirmButton
  confirm="Delete this event and all its items? This cannot be undone."
  formAction={deleteEvent}
  hidden={{ id: event.id }}
  className="px-3 py-1 rounded bg-red-600 text-white"
>
  Delete Event
</ConfirmButton>
          </form>

          {/* Itinerary Items */}
          <div className="space-y-4 mt-4">
            <h3 className="text-lg font-semibold">Itinerary Items</h3>

            {event.items.map((item) => (
              <div key={item.id} className="border p-3 rounded space-y-2">
                {/* Update Item */}
                <form action={updateItem} className="space-y-1">
                  <input type="hidden" name="id" value={item.id} />

                  <label className="block">
                    <span>Title:</span>
                    <input
                      name="title"
                      defaultValue={item.title}
                      className="border px-2 py-1 w-full"
                      required
                    />
                  </label>

                  <label className="block">
                    <span>Start:</span>
                    <input
                      type="datetime-local"
                      name="start"
                      defaultValue={toDatetimeLocalValue(new Date(item.start))}
                      className="border px-2 py-1 w-full"
                      required
                    />
                  </label>

                  <label className="block">
                    <span>End:</span>
                    <input
                      type="datetime-local"
                      name="end"
                      defaultValue={item.end ? toDatetimeLocalValue(new Date(item.end)) : ""}
                      className="border px-2 py-1 w-full"
                    />
                  </label>

                  <label className="block">
                    <span>Location:</span>
                    <input
                      name="location"
                      defaultValue={item.location ?? ""}
                      className="border px-2 py-1 w-full"
                    />
                  </label>

                  <label className="block">
                    <span>Notes:</span>
                    <textarea
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      className="border px-2 py-1 w-full"
                      rows={2}
                    />
                  </label>

                  <label className="block">
                    <span>Category:</span>
                    <input
                      name="category"
                      defaultValue={item.category ?? ""}
                      className="border px-2 py-1 w-full"
                    />
                  </label>

                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white mt-2">
                    Save Item
                  </button>
                </form>

                {/* Delete Item */}
                <form action={deleteItem} className="mt-1">
                  <input type="hidden" name="id" value={item.id} />
                 <ConfirmButton
  confirm="Delete this event and all its items? This cannot be undone."
  formAction={deleteItem}
  hidden={{ id: event.id }}
  className="px-3 py-1 rounded bg-red-600 text-white"
>
  Delete Event
</ConfirmButton>
                </form>
              </div>
            ))}
            <div className="border p-3 rounded space-y-2">
              <h4 className="font-medium">Add New Item</h4>
              <form action={createItem} className="space-y-1">
                <input type="hidden" name="eventId" value={event.id} />

                <label className="block">
                  <span>Title:</span>
                  <input name="title" className="border px-2 py-1 w-full" required />
                </label>

                <label className="block">
                  <span>Start:</span>
                  <input type="datetime-local" name="start" className="border px-2 py-1 w-full" required />
                </label>

                <label className="block">
                  <span>End:</span>
                  <input type="datetime-local" name="end" className="border px-2 py-1 w-full" />
                </label>

                <label className="block">
                  <span>Location:</span>
                  <input name="location" className="border px-2 py-1 w-full" />
                </label>

                <label className="block">
                  <span>Notes:</span>
                  <textarea name="notes" className="border px-2 py-1 w-full" rows={2} />
                </label>

                <label className="block">
                  <span>Category:</span>
                  <input name="category" className="border px-2 py-1 w-full" />
                </label>

                <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white mt-2">
                  Create Item
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}

      {/* Create Event */}
      <div className="border rounded p-4 space-y-4">
        <h2 className="text-xl font-semibold">Create New Event</h2>
        <form action={createEvent} className="space-y-2">
          <label className="block">
            <span>Title:</span>
            <input name="title" className="border px-2 py-1 w-full" required />
          </label>

          <label className="block">
            <span>Start:</span>
            <input type="datetime-local" name="start" className="border px-2 py-1 w-full" required />
          </label>

          <label className="block">
            <span>End:</span>
            <input type="datetime-local" name="end" className="border px-2 py-1 w-full" required />
          </label>

          <label className="block">
            <span>Timezone:</span>
            <input name="timezone" defaultValue="Pacific/Auckland" className="border px-2 py-1 w-full" />
          </label>

          <label className="block">
            <span>Location:</span>
            <input name="location" className="border px-2 py-1 w-full" />
          </label>

          <label className="block">
            <span>Address:</span>
            <input name="address" className="border px-2 py-1 w-full" />
          </label>

          <label className="block">
            <span>Description:</span>
            <textarea name="description" className="border px-2 py-1 w-full" rows={3} />
          </label>

          <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white">
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
}
