import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageMeta } from "../types";

/** Compact pager rendered under server-paginated tables and lists. */
export default function Pagination({ meta, onChange }: { meta: PageMeta; onChange: (page: number) => void }) {
  if (meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        className="btn-ghost !px-2"
        disabled={meta.page <= 1}
        onClick={() => onChange(meta.page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {meta.page} / {meta.pages}
      </span>
      <button
        className="btn-ghost !px-2"
        disabled={meta.page >= meta.pages}
        onClick={() => onChange(meta.page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
