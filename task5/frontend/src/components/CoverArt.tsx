import { useEffect, useState } from "react";
import { Cover } from "../types";

interface Props {
  cover: Cover;
  title: string;
  artist: string;
  /** Extra classes for the outer (square) container, e.g. sizing. */
  className?: string;
  eager?: boolean;
}

const shadow = "[text-shadow:_0_2px_10px_rgb(0_0_0_/_75%)]";

/**
 * Renders a real, photographic album cover (deterministic per song seed) with
 * one of five distinct typography overlays for the title/artist. The overlay
 * variant is chosen on the server via `cover.style`, giving the catalog highly
 * varied artwork. Falls back to a secondary image source if the primary fails.
 */
export function CoverArt({ cover, title, artist, className = "", eager = false }: Props) {
  const [src, setSrc] = useState(cover.imageUrl);

  // Reset when the song (seed/region) changes.
  useEffect(() => {
    setSrc(cover.imageUrl);
  }, [cover.imageUrl]);

  const style = ((cover.style % 5) + 5) % 5;

  const renderOverlay = () => {
    switch (style) {
      // 0 — Minimalist bottom-left with gradient scrim.
      case 0:
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className={`line-clamp-2 text-2xl font-bold leading-tight text-white ${shadow}`}>
                {title}
              </h3>
              <p className={`mt-1 truncate text-sm font-medium text-white/85 ${shadow}`}>
                {artist}
              </p>
            </div>
          </>
        );
      // 1 — Centered bold brutalist block text.
      case 1:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 p-4 text-center">
            <span className="max-w-full break-words bg-white px-3 py-1 text-2xl font-black uppercase leading-none tracking-tight text-black">
              {title}
            </span>
            <span className="bg-black px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.3em] text-white">
              {artist}
            </span>
          </div>
        );
      // 2 — Glassmorphism card over the lower third.
      case 2:
        return (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/25 bg-white/10 p-3 shadow-lg backdrop-blur-md">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-white">{title}</h3>
            <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wider text-white/75">
              {artist}
            </p>
          </div>
        );
      // 3 — Elegant serif header, top-right.
      case 3:
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-transparent" />
            <div className="absolute right-4 top-4 max-w-[82%] text-right">
              <h3 className={`line-clamp-3 font-serif text-2xl italic leading-tight text-white ${shadow}`}>
                {title}
              </h3>
              <p className={`mt-1 truncate font-serif text-sm uppercase tracking-widest text-white/85 ${shadow}`}>
                {artist}
              </p>
            </div>
          </>
        );
      // 4 — Condensed uppercase with a colored accent bar, bottom-left.
      default:
        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 max-w-[85%] border-l-4 border-brand-500 pl-3">
              <h3 className={`line-clamp-2 text-xl font-extrabold uppercase leading-none tracking-tight text-white ${shadow}`}>
                {title}
              </h3>
              <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.35em] text-accent-400">
                {artist}
              </p>
            </div>
          </>
        );
    }
  };

  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-zinc-800 ${className}`}>
      <img
        src={src}
        alt={`${title} — ${artist}`}
        loading={eager ? "eager" : "lazy"}
        onError={() => {
          if (src !== cover.fallbackUrl) setSrc(cover.fallbackUrl);
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {renderOverlay()}
    </div>
  );
}
