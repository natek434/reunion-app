"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { thumbUrl } from "./thumb-url";

type Props = { id: string; title?: string };

export default function VideoThumbnail({ id, title }: Props) {
  const [inView, setInView] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(() => thumbUrl(id, 640, 70));
  const [blurSrc, setBlurSrc] = useState(() => thumbUrl(id, 24, 40)); // tiny blur
  const ref = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // On unmount, pause and clear the video source to abort pending requests
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (!v) return;
      try { v.pause(); } catch {}
      try { v.removeAttribute("src"); v.load(); } catch {}
    };
  }, []);

  const handleThumbError = () => {
    // If the thumb route fails, fall back to a neutral data URI
    setThumbSrc(
      "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9" width="16" height="9">
             <rect width="16" height="9" fill="#111"/>
           </svg>`
        )
    );
    setBlurSrc(undefined as unknown as string);
  };

  const poster = thumbSrc; // your route returns images for videos too

  return (
    <div ref={ref} className="relative w-full aspect-video">
      {inView ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={`/api/files/${encodeURIComponent(id)}/video`}
          poster={poster}
          preload="none"
          controls
          playsInline
          title={title || ""}
          controlsList="nodownload"
        />
      ) : (
        <Image
          // Use fill since we're in a fixed aspect-ratio box
          fill
          // Help the browser choose an appropriate size
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
          src={thumbSrc}
          alt={title || "video preview"}
          loading="lazy"
          decoding="async"
          // Even with `unoptimized`, next/image still wants layout info; `fill` provides it.
          unoptimized
          placeholder={blurSrc ? "blur" : "empty"}
          blurDataURL={blurSrc}
          onError={handleThumbError}
        />
      )}
    </div>
  );
}
 
