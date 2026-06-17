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
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="gallery-view">
      <div className="gallery-grid">
        {songs.map((song) => (
          <div className="gallery-card" key={song.index}>
            <div className="card-cover">
              <img src={song.coverDataUri} alt={`${song.title} cover`} loading="lazy" />
              <span className="card-index">#{song.index}</span>
            </div>
            <div className="card-head">
              <div className="card-title">{song.title}</div>
              <div className="card-artist">{song.artist}</div>
              <div className="card-sub">
                <span className="genre-pill">{song.genre}</span>
                <span className="card-album">{song.album}</span>
              </div>
            </div>
            <SongDetails song={song} showCover={false} />
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="sentinel">
        {loading ? "Loading more…" : "Scroll for more"}
      </div>
    </div>
  );
}
