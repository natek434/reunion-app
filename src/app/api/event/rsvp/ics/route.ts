import { prisma } from "@/lib/db";

function dtstamp(d: Date) {
  // YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth()+1);
  const day = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}
function esc(s = "") { return s.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }

export async function GET() {
  const event = await prisma.event.findFirst({ include: { items: { orderBy: { start: "asc" } } } });
  if (!event) return new Response("No event", { status: 404 });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Whanau Reunion//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Reunion",
    "X-WR-TIMEZONE:UTC",
    "BEGIN:VEVENT",
    `UID:${event.id}@reunion`,
    `DTSTAMP:${dtstamp(new Date())}`,
    `DTSTART:${dtstamp(event.start)}`,
    `DTEND:${dtstamp(event.end)}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(event.description ?? "")}`,
    `LOCATION:${esc(event.location)}${event.address ? " - " + esc(event.address) : ""}`,
    "END:VEVENT",
  ];

  for (const it of event.items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${it.id}@reunion`,
      `DTSTAMP:${dtstamp(new Date())}`,
      `DTSTART:${dtstamp(it.start)}`,
      ...(it.end ? [`DTEND:${dtstamp(it.end)}`] : []),
      `SUMMARY:${esc(it.title)}`,
      ...(it.location ? [`LOCATION:${esc(it.location)}`] : []),
      ...(it.notes ? [`DESCRIPTION:${esc(it.notes)}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const ics = lines.join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reunion.ics"`,
    },
  });
}
