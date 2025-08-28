import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* Welcome / CTA */}
      <div className="card p-8">
        <h1 className="text-3xl font-bold mb-3">Kia ora — welcome to our reunion!</h1>
        <p className=" leading-relaxed">
          Nau mai, haere mai ki <strong>Rangi and Rarati Hanara Reunion</strong> 2025. 
          A time to reconnect, celebrate whakapapa, and create new memories together.
        </p>

        <p className=" mt-3">
          {session?.user ? (
            <>
              You’re signed in as{" "}
              <span className="font-medium">
                {session.user.name ?? session.user.email}
              </span>
              . Jump in below.
            </>
          ) : (
            <>
              Sign in to share photos & videos, RSVP to events, and view the private
              gallery.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="btn btn-primary">
                Upload files
              </Link>
              <Link href="/me" className="btn">
                My uploads
              </Link>
              <Link href="/event" className="btn">
                Event & RSVP
              </Link>
              <Link href="/family" className="btn">
                Family tree
              </Link>
              <Link href="/gallery" className="btn">
                Gallery
              </Link>
            </>
          ) : (
            <>
              <Link href="/signin" className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/event" className="btn">
                Event & RSVP
              </Link>
              <Link href="/gallery" className="btn">
                Gallery
              </Link>
              <Link href="/family" className="btn">
                Family tree
              </Link>
            </>
          )}
        </div>
      </div>

      {/* What you can do */}
      <div className="card p-8">
        <h2 className="text-xl font-semibold mb-3">What you can do</h2>
        <ul className="list-disc ml-5 space-y-2">
          <li>Sign in with Google or email/password</li>
          <li>Upload images & videos (stored privately in Google Drive)</li>
          <li>Browse and comment in the private family gallery</li>
          <li>See event details, full itinerary, and RSVP online</li>
          <li>Add reunion events directly to your calendar</li>
          <li>Explore the family tree and whakapapa connections</li>
          <li>Manage <em>My uploads</em> and remove files you’ve added</li>
        </ul>

        {/* Quick highlights */}
        <div className="mt-6">
          <h3 className="font-medium text-lg mb-2">Highlights of the weekend</h3>
          <p className="">
            Games and activities for tamariki, shared kai including a hāngi, 
            whakapapa storytelling, photo day, and plenty of time to catch up 
            with whānau from near and far.
          </p>
        </div>
      </div>
    </section>
  );
}
