import { useCallback, useEffect, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { TableView } from "./components/TableView";
import { GalleryView } from "./components/GalleryView";
import { fetchSongs } from "./api";
import { useDebounce } from "./hooks/useDebounce";
import { LocaleId, Song, ViewMode } from "./types";

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function App() {
  const [locale, setLocale] = useState<LocaleId>("en");
  const [seed, setSeed] = useState<string>(() => randomSeed());
  const [likes, setLikes] = useState<number>(4.7);
  const [view, setView] = useState<ViewMode>("table");

  // Debounce generation parameters so typing/sliding updates smoothly.
  const dSeed = useDebounce(seed, 350);
  const dLikes = useDebounce(likes, 250);
  const params = { seed: dSeed, locale, likes: dLikes };
  const paramsKey = `${dSeed}|${locale}|${dLikes}`;

  // ---- Table state ----
  const [tablePage, setTablePage] = useState(1);
  const [tableSongs, setTableSongs] = useState<Song[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // ---- Gallery state ----
  const [galleryPage, setGalleryPage] = useState(1);
  const [gallerySongs, setGallerySongs] = useState<Song[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Reset both views whenever a generation parameter changes.
  useEffect(() => {
    setTablePage(1);
    setGalleryPage(1);
    setGallerySongs([]);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [paramsKey]);

  // ---- Table loader ----
  useEffect(() => {
    if (view !== "table") return;
    const ctrl = new AbortController();
    setTableLoading(true);
    setError(null);
    fetchSongs({ ...params, page: tablePage }, ctrl.signal)
      .then((res) => setTableSongs(res.songs))
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e.message ?? e));
      })
      .finally(() => setTableLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, tablePage, view]);

  // ---- Gallery loader ----
  useEffect(() => {
    if (view !== "gallery") return;
    const ctrl = new AbortController();
    setGalleryLoading(true);
    setError(null);
    fetchSongs({ ...params, page: galleryPage }, ctrl.signal)
      .then((res) => {
        setGallerySongs((prev) => (galleryPage === 1 ? res.songs : [...prev, ...res.songs]));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e.message ?? e));
      })
      .finally(() => setGalleryLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, galleryPage, view]);

  const galleryLoadingRef = useRef(galleryLoading);
  galleryLoadingRef.current = galleryLoading;
  const handleLoadMore = useCallback(() => {
    if (!galleryLoadingRef.current) setGalleryPage((p) => p + 1);
  }, []);

  return (
    <div className="app">
      <Toolbar
        locale={locale}
        seed={seed}
        likes={likes}
        view={view}
        onLocale={setLocale}
        onSeed={setSeed}
        onShuffle={() => setSeed(randomSeed())}
        onLikes={setLikes}
        onView={setView}
      />

      {error && <div className="error-banner">⚠ {error}</div>}

      <main className="content">
        {view === "table" ? (
          <TableView
            songs={tableSongs}
            page={tablePage}
            loading={tableLoading}
            onPrev={() => setTablePage((p) => Math.max(1, p - 1))}
            onNext={() => setTablePage((p) => p + 1)}
          />
        ) : (
          <GalleryView songs={gallerySongs} loading={galleryLoading} onLoadMore={handleLoadMore} />
        )}
      </main>
    </div>
  );
}
