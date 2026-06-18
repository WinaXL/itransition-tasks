import { useEffect, useRef } from "react";
import { Song } from "../types";
import { SongDetails } from "./SongDetails";
import { CoverArt } from "./CoverArt";

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
            <CoverArt cover={song.cover} title={song.title} artist={song.artist} />

            <div className="flex items-center justify-between gap-2 px-5 pt-3">
              <span className="font-mono text-xs text-zinc-500">#{song.index}</span>
              <span className="text-xs font-semibold text-zinc-300">❤ {song.likes}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 overflow-hidden px-5">
              <span className="shrink-0 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                {song.genre}
              </span>
              <span className="truncate text-xs text-zinc-500" title={song.album}>
                {song.album}
              </span>
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
