// src/app/resources/page.tsx
import ResourcesClient from "./resources-client";
import { Metadata } from "next";
import UploadResourceButton from "@/app/resources/UploadResourceButton";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources | Rangi & Rarati Hanara Whānau",
  description: "Learning resources and downloads for the whānau.",
};

export type ResourceKind =
  | "pdf" | "doc" | "sheet" | "image" | "video" | "audio" | "link" | "zip" | "other";

export type Resource = {
  id: string;
  title: string;
  description?: string | null;
  kind: ResourceKind;
  tags?: string[];
  fileId?: string;
  filePath?: string | null;
  url?: string;
  externalUrl?: string | null;
  sizeBytes?: number | null;
  updatedAt?: string | Date | null;
};

// Build an absolute URL to your own API in any deploy setup
async function getBaseUrl(): Promise<string> {
  const h = await headers(); // ← important: await
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getResources(): Promise<Resource[]> {
  const base = await getBaseUrl(); // ← important: await
  const res = await fetch(`${base}/api/resources`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(
      "resources page: /api/resources failed",
      res.status,
      await res.text().catch(() => "")
    );
    return [];
  }

  const data = (await res.json()) as { items?: Resource[] } | Resource[];
  return Array.isArray(data) ? data : data.items || [];
}

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
          <p className="text-sm">
            Learning materials, guides, and downloads for the whānau.
          </p>
        </div>
        <UploadResourceButton />
      </header>

      <ResourcesClient initialItems={resources} />
    </main>
  );
}
