import { Fragment, useState } from "react";
import { Song } from "../types";
import { SongDetails } from "./SongDetails";

interface Props {
  songs: Song[];
  page: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function TableView({ songs, page, loading, onPrev, onNext }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (index: number) => {
    setExpanded((cur) => (cur === index ? null : index));
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl shadow-black/30">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400">
                <th className="w-14 px-4 py-3.5 text-right font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Title</th>
                <th className="px-4 py-3.5 font-semibold">Artist</th>
                <th className="px-4 py-3.5 font-semibold">Album</th>
                <th className="w-40 px-4 py-3.5 font-semibold">Genre</th>
                <th className="w-24 px-4 py-3.5 text-right font-semibold">Likes</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => {
                const open = expanded === song.index;
                return (
                  <Fragment key={song.index}>
                    <tr
                      onClick={() => toggle(song.index)}
                      className={`cursor-pointer border-b border-zinc-800/70 text-sm transition-colors ${
                        open ? "bg-zinc-800/60" : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                        {song.index}
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-brand-400 transition-transform ${open ? "rotate-90" : ""}`}
                          >
                            ▸
                          </span>
                          <span className="truncate font-semibold text-zinc-100" title={song.title}>
                            {song.title}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate text-zinc-300" title={song.artist}>
                          {song.artist}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <span className="block truncate text-zinc-400" title={song.album}>
                          {song.album}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                          {song.genre}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-zinc-300">
                        ❤ {song.likes}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="border-b border-zinc-800 bg-zinc-950/50 p-0">
                          <SongDetails song={song} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1 || loading}
          className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹ Prev
        </button>
        <span className="text-sm font-semibold text-zinc-400">Page {page}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={loading}
          className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
