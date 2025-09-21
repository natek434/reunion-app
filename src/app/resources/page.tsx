// src/app/resources/page.tsx
import ResourcesClient from "./resources-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources | Rangi & Rarati Hanara Whānau",
  description: "Learning resources and downloads for the whānau.",
};

export type ResourceKind = "pdf" | "doc" | "sheet" | "image" | "video" | "audio" | "link" | "zip" | "other";

export type Resource = {
  id: string;
  title: string;
  description?: string;
  kind: ResourceKind;
  tags?: string[];
  // Either point to an internal file id or an external URL:
  fileId?: string;     // served via /api/files/:id
  url?: string;        // external link
  sizeBytes?: number;
  updatedAt?: string;  // ISO
};

async function getResources(): Promise<Resource[]> {
  // TODO: replace with DB fetch or an internal API call
  return [
    {
      id: "r1",
      title: "Whānau Charter (PDF)",
      description: "Guiding principles, values, and governance overview.",
      kind: "pdf",
      fileId: "cmfabc123", // replace with your file id
      tags: ["governance", "charter"],
      sizeBytes: 402_312,
      updatedAt: "2025-08-10T00:00:00Z",
    },
    {
      id: "r2",
      title: "Marae Roles & Contacts (Sheet)",
      description: "Committee roles, responsibilities, and contact points.",
      kind: "sheet",
      url: "https://docs.google.com/spreadsheets/d/EXAMPLE",
      tags: ["committee", "contacts"],
      updatedAt: "2025-07-21T00:00:00Z",
    },
    {
      id: "r3",
      title: "Tikanga Basics (Video)",
      description: "Short video overview for new whānau members.",
      kind: "video",
      fileId: "cmfvideo001",
      tags: ["tikanga", "intro"],
      sizeBytes: 12_345_678,
    },
    {
      id: "r4",
      title: "Kupu Māori Starter (PDF)",
      description: "Beginner vocab for everyday use.",
      kind: "pdf",
      fileId: "cmfpdf002",
      tags: ["reo", "learning"],
      sizeBytes: 210_004,
    },
    {
      id: "r5",
      title: "External: Te Reo Māori resources",
      description: "Curated list of external learning links.",
      kind: "link",
      url: "https://tewhanake.maori.nz/",
      tags: ["reo", "external"],
    },
  ];
}

export default async function ResourcesPage() {
  const resources = await getResources();
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
        <p className="text-sm text-zinc-500">
          Learning materials, guides, and downloadable files for the whānau.
        </p>
      </header>

      <ResourcesClient initialItems={resources} />
    </main>
  );
}
