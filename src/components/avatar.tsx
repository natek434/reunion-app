// components/Avatar.tsx
"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, ComponentProps } from "react";

type Props = {
  customSrc?: string | null;
  providerSrc?: string | null;
  name: string;
  email: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  unoptimized?: boolean;
} & Pick<ComponentProps<typeof Image>,
  "referrerPolicy" | "priority" | "sizes" | "placeholder" | "blurDataURL">;

export default function Avatar({
  customSrc,
  providerSrc,
  name,
  email,
  size = 48,
  className = "",
  style,
  unoptimized,
  referrerPolicy = "no-referrer",
  ...imgProps
}: Props) {
  const initial = useMemo(
    () => (name || email || "?").trim().charAt(0).toUpperCase() || "?",
    [name, email]
  );

  // Build a UNIQUE fallback chain: [custom, provider] -> dedup
  const chain = useMemo(() => {
    const list = [customSrc || "", providerSrc || ""].filter(Boolean);
    return Array.from(new Set(list)); // remove duplicates
  }, [customSrc, providerSrc]);

  // Use a string key so changes in value (not just length) reset the index
  const chainKey = chain.join("|");
  const [idx, setIdx] = useState(chain.length ? 0 : 2);
  useEffect(() => {
    setIdx(chain.length ? 0 : 2);
  }, [chainKey, chain.length]);

  const src = idx < chain.length ? chain[idx] : "";
  const onError = () => setIdx((i) => (i < chain.length ? i + 1 : 2));

  // Hard, unsquashable circle box
  const box: React.CSSProperties = {
    width: size, height: size,
    minWidth: size, minHeight: size,
    maxWidth: size, maxHeight: size,
    flexShrink: 0,
    borderRadius: 9999,
    overflow: "hidden",
  };

  return (
    <div
      className={`flex-none rounded-full overflow-hidden ${className}`}
      style={{ ...box, ...style }}
      aria-label={`${name || email} avatar`}
    >
      {src ? (
        <Image
          key={src}
          src={src}
          alt={`${name || email} avatar`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={onError}
          referrerPolicy={referrerPolicy}
          {...(unoptimized ? { unoptimized: true } : {})}
          {...imgProps}
        />
      ) : (
        <div
          className="grid place-items-center w-full h-full bg-neutral-200 text-neutral-800"
          style={{ fontSize: Math.max(14, Math.floor(size * 0.44)) }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
