// src/app/resources/resource-card.tsx
"use client";

import type { Resource } from "./page";
import {
  FileText,
  File,
  FileSpreadsheet,
  ImageIcon,
  Video as VideoIcon,
  Music,
  Link2,
  Archive,
  Download,
  ExternalLink,
} from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

function kindIcon(kind: Resource["kind"]) {
  switch (kind) {
    case "pdf":
      return FileText;
    case "doc":
      return File;
    case "sheet":
      return FileSpreadsheet;
    case "image":
      return ImageIcon;
    case "video":
      return VideoIcon;
    case "audio":
      return Music;
    case "link":
      return Link2;
    case "zip":
      return Archive;
    default:
      return File;
  }
}

function fmtSize(n?: number) {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let u = 0;
  let v = n;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}

export default function ResourceCard({ res }: { res: Resource }) {
  const Icon = useMemo(() => kindIcon(res.kind), [res.kind]);

  // Be liberal in what we accept; normalize possible fields
  const fileId = (res as any).fileId as string | undefined;
  const filePath = (res as any).filePath as string | undefined;
  const externalUrl =
    (res as any).externalUrl || (res as any).url || undefined;

  // Determine hrefs
  const isExternalOnly = !!externalUrl && !fileId && !filePath;

  // For "view", prefer inline view: videos -> /video, other files -> download endpoint (can change to inline later)
  const viewHref = fileId
    ? `/api/files/${fileId}${res.kind === "video" ? "/video" : ""}`
    : filePath
    ? `/api/resources/${(res as any).id}/download`
    : externalUrl || "#";

  const downloadHref = fileId
    ? `/api/files/${fileId}`
    : filePath
    ? `/api/resources/${(res as any).id}/download`
    : externalUrl || "#";

  // Safer updatedAt label
  const updatedLabel = (() => {
    const raw = (res as any).updatedAt as string | Date | undefined;
    if (!raw) return "";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  })();

  return (
    <article className="resource-card">
      <div className="p-4 flex items-start gap-3">
        <div className="p-2 icon-pill">
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-tight truncate" title={res.title}>
            {res.title}
          </h3>

          {res.description && (
            <p className="text-sm resource-desc line-clamp-2 mt-0.5">
              {res.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {res.tags?.map((t) => (
              <span
                key={t}
                className="chip"
              >
                {t}
              </span>
            ))}
            <span className="text-[11px]">
              {fmtSize((res as any).sizeBytes)}
              {updatedLabel ? ` · Updated ${updatedLabel}` : ""}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {/* VIEW */}
            <Link
              href={viewHref}
              target={isExternalOnly ? "_blank" : undefined}
              rel={isExternalOnly ? "noopener noreferrer" : undefined}
              className="action"
              aria-label={`View ${res.title}`}
            >
              <ExternalLink size={14} />
              View
            </Link>

            {/* DOWNLOAD */}
            <a
              href={downloadHref}
              target={isExternalOnly ? "_blank" : undefined}
              rel={isExternalOnly ? "noopener noreferrer" : undefined}
              className="action action--bordered"
              aria-label={`Download ${res.title}`}
            >
              <Download size={14} />
              Download
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
