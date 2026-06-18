import { useEffect, useRef } from "react";
import { Song } from "../types";
import { SongDetails } from "./SongDetails";

interface Props {
  songs: Song[];
  loading: boolean;
  onLoadMore: () => void;
}

export function GalleryView({ songs, loading, onLoadMore }: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {songs.map((song) => (
          <article
            key={song.index}
            className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30 transition hover:border-zinc-700"
          >
            <div className="relative">
              <img
                src={song.coverDataUri}
                alt={`${song.title} cover`}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
                #{song.index}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
                ❤ {song.likes}
              </span>
            </div>

            <div className="px-5 pt-4">
              <h3 className="truncate text-lg font-extrabold text-zinc-100" title={song.title}>
                {song.title}
              </h3>
              <p className="truncate text-sm text-zinc-400" title={song.artist}>
                {song.artist}
              </p>
              <div className="mt-2 flex items-center gap-2 overflow-hidden">
                <span className="shrink-0 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                  {song.genre}
                </span>
                <span className="truncate text-xs text-zinc-500" title={song.album}>
                  {song.album}
                </span>
              </div>
            </div>

            <div className="mt-1 border-t border-zinc-800/60">
              <SongDetails song={song} showCover={false} />
            </div>
          </article>
        ))}
      </div>

      <div
        ref={sentinelRef}
        className="py-10 text-center text-sm font-semibold text-zinc-500"
      >
        {loading ? "Loading more…" : "Scroll for more"}
      </div>
    </div>
  );
}
