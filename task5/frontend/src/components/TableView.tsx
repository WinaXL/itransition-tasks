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
    <div className="table-view">
      <table>
        <thead>
          <tr>
            <th className="col-idx">#</th>
            <th>Title</th>
            <th>Artist</th>
            <th>Album</th>
            <th>Genre</th>
            <th className="col-likes">Likes</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song) => (
            <Fragment key={song.index}>
              <tr
                className={`song-row ${expanded === song.index ? "expanded" : ""}`}
                onClick={() => toggle(song.index)}
              >
                <td className="col-idx">{song.index}</td>
                <td>
                  <span className="expand-caret">{expanded === song.index ? "▾" : "▸"}</span>
                  {song.title}
                </td>
                <td>{song.artist}</td>
                <td>{song.album}</td>
                <td>
                  <span className="genre-pill">{song.genre}</span>
                </td>
                <td className="col-likes">❤ {song.likes}</td>
              </tr>
              {expanded === song.index && (
                <tr className="detail-row">
                  <td colSpan={6}>
                    <SongDetails song={song} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button type="button" onClick={onPrev} disabled={page <= 1 || loading}>
          ‹ Prev
        </button>
        <span className="page-indicator">Page {page}</span>
        <button type="button" onClick={onNext} disabled={loading}>
          Next ›
        </button>
      </div>
    </div>
  );
}
