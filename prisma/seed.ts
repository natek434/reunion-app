// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const NZ = "Pacific/Auckland";
const MARAE = "Te Awhina Marae";
const ADDRESS = "49 Taihape Road, Omahu, Hastings";

/**
 * Simple helper: make a Date object at local-wall time for NZ in September (+12 approx).
 * If you want exact DST handling, switch to date-fns-tz or luxon.
 */
function nzDate(y: number, m: number, d: number, hh = 9, mm = 0) {
  // m is 1-based; crude +12 offset for Sept (NZST/NZDT transition is later)
  return new Date(Date.UTC(y, m - 1, d, hh - 12, mm));
}

async function main() {
  // Clean any prior copy (optional)
  await prisma.itineraryItem.deleteMany({
    where: { event: { title: "Te Awhina Marae Whānau Reunion" } },
  });
  await prisma.event.deleteMany({ where: { title: "Te Awhina Marae Whānau Reunion" } });

  const event = await prisma.event.create({
    data: {
      title: "Te Awhina Marae Whānau Reunion",
      start: nzDate(2025, 9, 11, 9, 0),
      end: nzDate(2025, 9, 15, 17, 0),
      timezone: NZ,
      location: MARAE,
      address: ADDRESS,
      description: "Five-day whānau reunion based at Te Awhina Marae.",
    },
  });

  const items = [
    // Thu 11
    { eventId: event.id, title: "Setup", start: nzDate(2025, 9, 11, 9, 0), location: MARAE, category: "setup", notes: "Venue prep – tables/chairs/bedrolls. Bring cordless drills if you have them." },
    { eventId: event.id, title: "Grouping", start: nzDate(2025, 9, 11, 10, 0), location: MARAE, category: "activity", notes: "Form whānau groups for activities and support during the weekend." },
    { eventId: event.id, title: "Dreams & Aspirations for Te Awhina Marae", start: nzDate(2025, 9, 11, 11, 0), location: MARAE, category: "hui", notes: "Open kōrero about the marae’s future. Notes captured for action list." },
    { eventId: event.id, title: "Meet & Greet", start: nzDate(2025, 9, 11, 16, 0), location: MARAE, category: "social", notes: "Introduce your group and hosts. Light refreshments available." },
    { eventId: event.id, title: "Registrations", start: nzDate(2025, 9, 11, 16, 30), location: MARAE, category: "admin", notes: "Sign in at the wharekai entrance. Collect wristbands and group colour." },
    { eventId: event.id, title: "Dinner", start: nzDate(2025, 9, 11, 18, 0), location: MARAE, category: "meal", notes: "Shared kai. Please note any allergies at registration." },
    { eventId: event.id, title: "Whakapapa", start: nzDate(2025, 9, 11, 19, 30), location: MARAE, category: "wānanga", notes: "Bring any photos, names, and dates you can contribute." },
    { eventId: event.id, title: "Waiata", start: nzDate(2025, 9, 11, 20, 30), location: MARAE, category: "kapa", notes: "Song practice — learn parts for the weekend." },

    // Fri 12
    { eventId: event.id, title: "Olympics – Three-legged Race", start: nzDate(2025, 9, 12, 10, 0), location: MARAE, category: "games", notes: "Pairs by height if possible. Closed shoes recommended." },
    { eventId: event.id, title: "Olympics – Wheelbarrow Race",  start: nzDate(2025, 9, 12, 10, 30), location: MARAE, category: "games", notes: "Spotters around course. Keep knees protected." },
    { eventId: event.id, title: "Olympics – Tug of War",        start: nzDate(2025, 9, 12, 11, 0), location: MARAE, category: "games", notes: "Gloves available; listen for start/stop whistle." },
    { eventId: event.id, title: "Arts & Crafts",                start: nzDate(2025, 9, 12, 13, 0), location: MARAE, category: "activity", notes: "All ages welcome. Supplies provided; donations welcome." },
    { eventId: event.id, title: "Cookie Decorating",            start: nzDate(2025, 9, 12, 13, 30), location: MARAE, category: "activity", notes: "Aprons on tables. Ingredients labelled for allergens." },
    { eventId: event.id, title: "Weaving Flowers",              start: nzDate(2025, 9, 12, 14, 0), location: MARAE, category: "activity", notes: "Beginner-friendly; materials supplied." },
    { eventId: event.id, title: "Rock Painting",                start: nzDate(2025, 9, 12, 14, 30), location: MARAE, category: "activity", notes: "Paint rocks to place at the urupā on Sunday." },
    { eventId: event.id, title: "Pizza Making",                 start: nzDate(2025, 9, 12, 15, 30), location: MARAE, category: "kai", notes: "Gluten-free bases available on request." },
    { eventId: event.id, title: "Minute to Win It Games",       start: nzDate(2025, 9, 12, 16, 30), location: MARAE, category: "games", notes: "Fast-paced station challenges; join any time." },
    { eventId: event.id, title: "Disco Night",                  start: nzDate(2025, 9, 12, 19, 0), location: MARAE, category: "social", notes: "Family-friendly playlist. Bring your best moves!" },

    // Sat 13
    { eventId: event.id, title: "Photo Booth Area", start: nzDate(2025, 9, 13, 10, 0), end: nzDate(2025, 9, 13, 14, 0), location: MARAE, category: "activity", notes: "Props provided. Tag photos with #TeAwhinaReunion." },
    { eventId: event.id, title: "Bouncy Castle",    start: nzDate(2025, 9, 13, 10, 0), end: nzDate(2025, 9, 13, 14, 0), location: MARAE, category: "activity", notes: "Supervised. Socks required; no sharp objects." },
    { eventId: event.id, title: "Slide",            start: nzDate(2025, 9, 13, 10, 0), end: nzDate(2025, 9, 13, 14, 0), location: MARAE, category: "activity", notes: "One at a time; wait for clear landing area." },
    { eventId: event.id, title: "Slip and Slide",   start: nzDate(2025, 9, 13, 14, 0), location: MARAE, category: "activity", notes: "Bring togs & towel. Sunscreen station nearby." },
    { eventId: event.id, title: "Bikes (from home)",start: nzDate(2025, 9, 13, 15, 0), location: null, category: "activity", notes: "Helmets required; parent supervision for tamariki." },
    { eventId: event.id, title: "Popcorn Making",   start: nzDate(2025, 9, 13, 15, 30), location: MARAE, category: "kai", notes: "Hot surface caution; butter/salt provided." },
    { eventId: event.id, title: "Fairy Floss Machine", start: nzDate(2025, 9, 13, 16, 0), location: MARAE, category: "kai", notes: "Queue forms to the left; sticky but worth it." },
    { eventId: event.id, title: "Arts & Crafts (More)", start: nzDate(2025, 9, 13, 16, 30), location: MARAE, category: "activity", notes: "Carry-on session for unfinished creations." },
    { eventId: event.id, title: "Rock Painting (More)",  start: nzDate(2025, 9, 13, 17, 0), location: MARAE, category: "activity", notes: "Finish rocks for the urupā visit." },
    { eventId: event.id, title: "Bake Off (Groups Comp)",start: nzDate(2025, 9, 13, 18, 0), location: MARAE, category: "competition", notes: "Judging on taste, presentation, and teamwork." },
    { eventId: event.id, title: "Movie Night",           start: nzDate(2025, 9, 13, 19, 30), location: MARAE, category: "social", notes: "Bring blankets/beanbags. Family films." },
    { eventId: event.id, title: "Hāngi Prep",            start: nzDate(2025, 9, 13, 20, 0), location: MARAE, category: "prep", notes: "Peeling and packing kai. Gloves provided." },

    // Sun 14
    { eventId: event.id, title: "Hākari Day", start: nzDate(2025, 9, 14, 9, 0), location: MARAE, category: "meal", notes: "Finalise seating and serving teams." },
    { eventId: event.id, title: "Hīkoi to the Urupā (clean up, lay flowers & painted rocks)", start: nzDate(2025, 9, 14, 10, 0), location: null, category: "offsite", notes: "Transport by carpool. Bring hat & water. Place painted rocks respectfully." },
    { eventId: event.id, title: "Hīkoi to Puketapu", start: nzDate(2025, 9, 14, 12, 0), location: null, category: "offsite", notes: "Walkers should wear sturdy footwear. Allow extra time for tamariki." },
    { eventId: event.id, title: "Lunch / Hākari",   start: nzDate(2025, 9, 14, 13, 30), location: MARAE, category: "meal", notes: "Shared kai after hīkoi. Please wash hands on return." },
    { eventId: event.id, title: "Skits / Show",     start: nzDate(2025, 9, 14, 15, 0), location: MARAE, category: "performance", notes: "Groups perform 3–5 mins. Sign-up sheet in wharekai." },
    { eventId: event.id, title: "Photo Day",        start: nzDate(2025, 9, 14, 16, 30), location: MARAE, category: "photos", notes: "Group photos by whānau and then all-in." },
    { eventId: event.id, title: "Movies",           start: nzDate(2025, 9, 14, 18, 30), location: MARAE, category: "social", notes: "Quiet hour screening for the kids first." },

    // Mon 15
    { eventId: event.id, title: "Slide Show", start: nzDate(2025, 9, 15, 10, 0), location: MARAE, category: "photos", notes: "Highlights from the weekend. Share your favourites." },
    { eventId: event.id, title: "Pack Up, Clean Up & Leave", start: nzDate(2025, 9, 15, 12, 0), location: MARAE, category: "packup", notes: "All hands on: kitchens, halls, outside areas. Lost property table by exit." },
  ] as const;

  await prisma.itineraryItem.createMany({ data: items as any });
  console.log(`Seeded event ${event.id} with ${items.length} items (with notes).`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
