import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-prose p-8 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you wanted isn’t here.</p>
      <Link className="btn mt-6" href="/">Back</Link>
    </main>
  );
}
