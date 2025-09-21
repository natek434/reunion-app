// src/app/resources/resource-card.tsx
"use client";

import type { Resource } from "./page";
import { FileText, File, FileSpreadsheet, ImageIcon, Video, Music, Link2, Archive, Download, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

function kindIcon(kind: Resource["kind"]) {
  switch (kind) {
    case "pdf": return FileText;
    case "doc": return File;
    case "sheet": return FileSpreadsheet;
    case "image": return ImageIcon;
    case "video": return Video;
    case "audio": return Music;
    case "link": return Link2;
    case "zip": return Archive;
    default: return File;
  }
}

function fmtSize(n?: number) {
  if (!n || n <= 0) return "";
  const units = ["B","KB","MB","GB"];
  let u = 0; let v = n;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}

export default function ResourceCard({ res }: { res: Resource }) {
  const Icon = useMemo(() => kindIcon(res.kind), [res.kind]);

  // Internal files use your file route; externals use given URL.
  const viewHref = res.fileId ? `/api/files/${res.fileId}${res.kind === "video" ? "/video" : ""}` : (res.url || "#");
  const downloadHref = res.fileId ? `/api/files/${res.fileId}` : (res.url || "#");

  const hasExternal = !!res.url && !res.fileId;

  return (
    <article className="rounded-xl border bg-white/50 backdrop-blur shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-zinc-100">
          <Icon size={20} className="text-zinc-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-tight truncate" title={res.title}>{res.title}</h3>
          {res.description && <p className="text-sm text-zinc-600 line-clamp-2 mt-0.5">{res.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {res.tags?.map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border text-zinc-600 bg-white">{t}</span>
            ))}
            <span className="text-[11px] text-zinc-500">
              {fmtSize(res.sizeBytes)}{res.updatedAt ? ` · Updated ${new Date(res.updatedAt).toLocaleDateString()}` : ""}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href={viewHref}
              target={hasExternal ? "_blank" : undefined}
              className="inline-flex items-center gap-1 rounded-md bg-gray-300 text-white px-3 py-1.5 text-sm hover:bg-gray-50"
              aria-label={`View ${res.title}`}
            >
              <ExternalLink size={14} /> View
            </Link>
            <a
              href={downloadHref}
              download={res.fileId ? "" : undefined}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-100"
              aria-label={`Download ${res.title}`}
            >
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
