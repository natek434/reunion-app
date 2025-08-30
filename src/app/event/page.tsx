import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Countdown from "./countdown";
import RSVPClient from "./rsvp-client";

function fmtRange(start: Date, end: Date, tz: string) {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short", timeZone: tz };
  const s = new Intl.DateTimeFormat(undefined, opts).format(start);
  const e = new Intl.DateTimeFormat(undefined, opts).format(end);
  return `${s} — ${e}`;
}

export default async function EventPage() {
  const session = await getServerSession(authOptions);
  const event = await prisma.event.findFirst({
    include: { items: { orderBy: { start: "asc" } }, rsvps: true },
  });

  if (!event) {
    return (
      <div className="card p-8">
        <h1 className="text-2xl font-semibold">No event yet</h1>
        <p className="mt-2">Create an Event row in the database to see details here.</p>
      </div>
    );
  }

  const serverNow = Date.now();

  // Use the authenticated user's id (set by NextAuth) to locate their RSVP.
  const you = session?.user?.id
    ? event.rsvps.find((r) => r.userId === (session!.user as any).id)
    : null;

  // group itinerary by day
  const byDay = event.items.reduce((acc: Record<string, typeof event.items>, it) => {
    const key = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeZone: event.timezone }).format(it.start);
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  // Google Calendar link
  const gcal = (() => {
    const enc = encodeURIComponent;
    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${enc(event.title)}&dates=${dt(
      event.start
    )}/${dt(event.end)}&location=${enc(event.location)}&details=${enc(event.description ?? "")}`;
  })();

  return (
    <section className="grid gap-6">
      <div className="card p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="mt-1">{fmtRange(event.start, event.end, event.timezone)}</p>
            <p className="mt-1">
              {event.location}
              {event.address ? ` — ${event.address}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <a className="btn" href="/api/event/ics">Download .ics</a>
            <a className="btn btn-primary" target="_blank" rel="noreferrer noopener" href={gcal}>
              Add to Google Calendar
            </a>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-2">Countdown</h2>
            <Countdown toEpochMs={event.start.getTime()} serverNowEpochMs={serverNow} />
          </div>

          <div className="card p-6">
            <h2 className="font-semibold mb-2">About</h2>
            <p>{event.description ?? "No description yet."}</p>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold mb-2">RSVP</h2>
            {session?.user?.email ? (
              <RSVPClient
                eventId={event.id}
                initialStatus={you?.status ?? "PENDING"}
                initialGuests={you?.guests ?? 0}
              />
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3">
                <p>
                  <span className="mr-1">🔒</span>
                  Please <Link className="underline font-medium" href="/signin">sign in</Link> to RSVP.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-8">
        {session?.user?.email ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">Itinerary</h2>
            <div className="space-y-6">
              {Object.entries(byDay).map(([day, items]) => (
                <div key={day}>
                  <h3 className="text-lg font-semibold mb-3">{day}</h3>
                  <ol className="relative border-l pl-4 space-y-5">
                    {items.map((it) => (
                      <li key={it.id} className="ml-2">
                        <span className="absolute -left-1 mt-1 h-2 w-2 rounded-full bg-black" />
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="font-medium">{it.title}</div>
                            {it.location && <div className="text-sm">{it.location}</div>}
                            {it.notes && <div className="text-sm mt-1">{it.notes}</div>}
                          </div>
                          <div className="text-sm whitespace-nowrap">
                            {new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: event.timezone }).format(
                              it.start
                            )}
                            {it.end
                              ? ` – ${new Intl.DateTimeFormat(undefined, {
                                  timeStyle: "short",
                                  timeZone: event.timezone,
                                }).format(it.end)}`
                              : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-blue-300 bg-blue-50 text-blue-900 p-5">
            <h3 className="font-semibold mb-1">Itinerary available after sign-in</h3>
            <p className="text-sm">
              Please <Link className="underline font-medium" href="/signin">sign in</Link> to see the detailed schedule,
              times, and locations for each activity.
            </p>
          </div>
        )}
      </div>

      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-2">Getting There & Details</h2>
        <div className="space-y-4">
          {/* Travel Info */}
          <div>
            <h3 className="font-medium">Travel & Parking</h3>
            <p>
              The nearest airport is <strong>Hawke’s Bay Airport (NPE)</strong> in Napier, about 20 minutes’ drive from
              Omahu. On-site parking is available at Te Awhina Marae, with overflow parking nearby if needed.
            </p>
          </div>

          {/* What to Bring */}
          <div>
            <h3 className="font-medium">What to Bring</h3>
            <ul className="list-disc list-inside">
              <li>Pillows, blankets, or sleeping bags (limited bedding provided)</li>
              <li>Comfortable clothes, swimwear, and walking shoes</li>
              <li>Reusable water bottles and any personal medication</li>
              <li>Photos, taonga, or stories to share for whakapapa sessions</li>
            </ul>
          </div>

          {/* Other Notes */}
          <div>
            <h3 className="font-medium">Other Details</h3>
            <p>
              Meals will be provided, but you are welcome to contribute kai for shared tables. Please respect marae kawa
              and tikanga throughout the weekend.
            </p>
          </div>

          {/* Map Link */}
          {event.address && (
            <p className="mt-2">
              <a
                className="underline"
                target="_blank"
                rel="noreferrer noopener"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
              >
                Open in Google Maps
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
