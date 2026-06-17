import { LocaleId, ViewMode } from "../types";

interface ToolbarProps {
  locale: LocaleId;
  seed: string;
  likes: number;
  view: ViewMode;
  onLocale: (l: LocaleId) => void;
  onSeed: (s: string) => void;
  onShuffle: () => void;
  onLikes: (n: number) => void;
  onView: (v: ViewMode) => void;
}

const LOCALE_LABELS: Record<LocaleId, string> = {
  en: "English (US)",
  de: "Deutsch (DE)",
  uk: "Українська (UA)",
};

export function Toolbar(props: ToolbarProps) {
  const { locale, seed, likes, view } = props;
  return (
    <div className="toolbar">
      <div className="brand">🎵 Soundforge</div>

      <div className="control">
        <label htmlFor="locale">Language</label>
        <select
          id="locale"
          value={locale}
          onChange={(e) => props.onLocale(e.target.value as LocaleId)}
        >
          {(Object.keys(LOCALE_LABELS) as LocaleId[]).map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
      </div>

      <div className="control seed-control">
        <label htmlFor="seed">Seed</label>
        <div className="seed-row">
          <input
            id="seed"
            type="text"
            value={seed}
            placeholder="enter a seed"
            onChange={(e) => props.onSeed(e.target.value)}
          />
          <button
            type="button"
            className="shuffle"
            title="Random seed"
            onClick={props.onShuffle}
          >
            🔀
          </button>
        </div>
      </div>

      <div className="control likes-control">
        <label htmlFor="likes">Avg. likes: {likes.toFixed(1)}</label>
        <div className="likes-row">
          <input
            id="likes"
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={likes}
            onChange={(e) => props.onLikes(Number(e.target.value))}
          />
          <input
            type="number"
            className="likes-number"
            min={0}
            max={10}
            step={0.1}
            value={likes}
            onChange={(e) => props.onLikes(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="control view-toggle">
        <label>View</label>
        <div className="seg">
          <button
            type="button"
            className={view === "table" ? "active" : ""}
            onClick={() => props.onView("table")}
          >
            Table
          </button>
          <button
            type="button"
            className={view === "gallery" ? "active" : ""}
            onClick={() => props.onView("gallery")}
          >
            Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
