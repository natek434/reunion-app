"use client";

import { useEffect, useRef, useState } from "react";
import { thumbUrl } from "./thumb-url";
import Image from "next/image";

export default function VideoThumbnail({ id, title }: { id: string; title?: string }) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, { rootMargin: "800px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const poster = thumbUrl(id, 640, 70);

  return (
    <div ref={ref} className="relative w-full aspect-video">
      {inView ? (
        <video
          className="w-full h-full object-cover"
          src={`/api/files/${id}/video`}
          poster={poster}
          preload="none"
          controls
          title={title || ""}
        />
      ) : (
        // lightweight placeholder before the player mounts
        <Image
          className="w-full h-full object-cover"
          src={poster}
          alt={title || "video preview"}
          loading="lazy"
          decoding="async"
          unoptimized
        />
      )}
    </div>
  );
}
