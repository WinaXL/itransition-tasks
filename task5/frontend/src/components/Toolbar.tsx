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

const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-zinc-400";
const fieldCls =
  "w-full rounded-lg border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function Toolbar(props: ToolbarProps) {
  const { locale, seed, likes, view } = props;

  return (
    <header className="sticky top-0 z-50 mb-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl md:flex-row md:flex-wrap md:items-end">
        <div className="flex items-center gap-2 self-center md:mr-auto">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg">
            🎵
          </span>
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Soundforge
          </span>
        </div>

        {/* Language */}
        <div className="flex min-w-[150px] flex-col gap-1.5">
          <label htmlFor="locale" className={labelCls}>
            Language
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => props.onLocale(e.target.value as LocaleId)}
            className={fieldCls}
          >
            {(Object.keys(LOCALE_LABELS) as LocaleId[]).map((l) => (
              <option key={l} value={l} className="bg-zinc-900">
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </div>

        {/* Seed + shuffle */}
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="seed" className={labelCls}>
            Seed
          </label>
          <div className="flex gap-2">
            <input
              id="seed"
              type="text"
              value={seed}
              placeholder="enter a seed"
              onChange={(e) => props.onSeed(e.target.value)}
              className={fieldCls}
            />
            <button
              type="button"
              title="Random seed"
              onClick={props.onShuffle}
              className="shrink-0 rounded-lg bg-brand-500 px-3 text-base text-white transition hover:bg-brand-600 active:scale-95"
            >
              🔀
            </button>
          </div>
        </div>

        {/* Likes */}
        <div className="flex min-w-[220px] flex-col gap-1.5">
          <label htmlFor="likes" className={labelCls}>
            Avg. likes · <span className="text-brand-400">{likes.toFixed(1)}</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="likes"
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={likes}
              onChange={(e) => props.onLikes(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer accent-brand-500"
            />
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={likes}
              onChange={(e) => props.onLikes(Number(e.target.value))}
              className={`${fieldCls} w-20`}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>View</span>
          <div className="flex overflow-hidden rounded-lg border border-zinc-700/70">
            {(["table", "gallery"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => props.onView(v)}
                className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                  view === v
                    ? "bg-brand-500 text-white"
                    : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
