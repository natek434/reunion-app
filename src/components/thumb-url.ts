// src/components/thumb-url.ts
export function thumbUrl(id: string, w = 480, q = 70) {
  return `/api/files/${id}/thumb?w=${w}&q=${q}`;
}
