import { useEffect, useMemo, useRef } from "react";
import { Song } from "../types";
import { useSongPlayer } from "../audio/useSongPlayer";

interface Props {
  song: Song;
  showCover?: boolean;
}

export function SongDetails({ song, showCover = true }: Props) {
  const { isPlaying, position, toggle } = useSongPlayer(song.audio);

  // Determine the currently active lyric line based on playback position.
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

  return (
    <div className="song-details">
      {showCover && (
        <div className="detail-cover">
          <img src={song.coverDataUri} alt={`${song.title} cover`} />
        </div>
      )}

      <div className="detail-main">
        <div className="player-bar">
          <button type="button" className={`play-btn ${isPlaying ? "playing" : ""}`} onClick={toggle}>
            {isPlaying ? "⏸ Stop" : "▶ Play"}
          </button>
          <div className="track-meta">
            <span className="badge">{song.audio.bpm} BPM</span>
            <span className="badge">{song.audio.scaleName}</span>
            <span className="badge">{song.audio.rootNote} root</span>
            <span className="badge">{song.audio.leadSynth}</span>
          </div>
        </div>

        <div className="lyrics-panel">
          <h4>Lyrics {isPlaying ? "♪" : ""}</h4>
          <div className="lyrics-scroll" ref={lyricsRef}>
            {song.lyrics.map((line, i) => (
              <p
                key={i}
                ref={i === activeLine ? activeRef : null}
                className={`lyric-line ${i === activeLine ? "active" : ""} ${
                  i < activeLine ? "passed" : ""
                }`}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>

        <div className="reviews-panel">
          <h4>
            Reviews <span className="muted">({song.reviewCount})</span> · ❤ {song.likes}
          </h4>
          {song.reviews.length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <ul className="reviews">
              {song.reviews.map((r, i) => (
                <li key={i}>
                  <span className="review-author">{r.author}</span>
                  <span className="review-text">{r.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
