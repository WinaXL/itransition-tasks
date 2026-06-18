import { useEffect, useMemo, useRef } from "react";
import { Song } from "../types";
import { useSongPlayer } from "../audio/useSongPlayer";
import { CoverArt } from "./CoverArt";

interface Props {
  song: Song;
  showCover?: boolean;
}

export function SongDetails({ song, showCover = true }: Props) {
  const { isPlaying, position, toggle } = useSongPlayer(song.audio);

  const activeLine = useMemo(() => {
    if (!isPlaying) return -1;
    let active = 0;
    for (let i = 0; i < song.lyrics.length; i++) {
      if (song.lyrics[i].time <= position) active = i;
      else break;
    }
    return active;
  }, [isPlaying, position, song.lyrics]);

  const lyricsRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (activeRef.current && lyricsRef.current) {
      const container = lyricsRef.current;
      const el = activeRef.current;
      const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [activeLine]);

  const loop = song.audio;
  const badges = [`${loop.bpm} BPM`, loop.scaleName, `${loop.rootNote} root`, loop.leadSynth];

  return (
    <div className="flex flex-col gap-5 p-5 lg:flex-row">
      {showCover && (
        <div className="w-full shrink-0 lg:w-56">
          <CoverArt
            cover={song.cover}
            title={song.title}
            artist={song.artist}
            className="rounded-xl shadow-lg shadow-black/50"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Player bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95 ${
              isPlaying
                ? "bg-rose-500 shadow-rose-500/30 hover:bg-rose-600"
                : "bg-gradient-to-r from-brand-500 to-accent-500 shadow-brand-500/30 hover:brightness-110"
            }`}
          >
            <span className="text-base leading-none">{isPlaying ? "⏸" : "▶"}</span>
            {isPlaying ? "Stop" : "Play"}
          </button>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-md border border-zinc-700/70 bg-zinc-800/60 px-2.5 py-1 text-xs font-semibold text-zinc-300"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Lyrics */}
        <div className="mb-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            Lyrics
            {isPlaying && <span className="text-accent-400 animate-pulse">♪</span>}
          </h4>
          <div
            ref={lyricsRef}
            className="scroll-thin h-40 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 px-5 py-3"
          >
            {song.lyrics.map((line, i) => (
              <p
                key={i}
                ref={i === activeLine ? activeRef : null}
                className={`my-1.5 transition-all duration-300 ${
                  i === activeLine
                    ? "translate-x-1 text-lg font-bold text-accent-400"
                    : i < activeLine
                    ? "text-base text-zinc-600"
                    : "text-base text-zinc-500"
                }`}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-zinc-200">
            Reviews <span className="font-normal text-zinc-500">({song.reviewCount})</span>
            <span className="ml-2 font-normal text-zinc-400">❤ {song.likes}</span>
          </h4>
          {song.reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">No reviews yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {song.reviews.map((r, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-3.5 py-2.5"
                >
                  <span className="block text-xs font-bold text-brand-400">{r.author}</span>
                  <span className="text-sm text-zinc-200">{r.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
