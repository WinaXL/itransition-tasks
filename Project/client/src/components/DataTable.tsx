import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

/**
 * Table with checkbox selection and a toolbar above it — actions apply to the
 * selection instead of per-row buttons (per the course requirements).
 * Rows can also navigate on click and columns are sortable.
 */
export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  toolbar,
  onRowClick,
  selectable = true,
  footer,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  toolbar?: (selected: T[], clear: () => void) => ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const col = columns.find((c) => c.key === sort.key);
        const va = col?.sortValue?.(a) ?? "";
        const vb = col?.sortValue?.(b) ?? "";
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      })
    : rows;

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map(rowKey)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const clear = () => setSelected(new Set());

  return (
    <div className="card overflow-hidden">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          {toolbar(selectedRows, clear)}
          {selected.size > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              {selected.size} {t("common.selected")}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              {selectable && (
                <th className="w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-brand-600" />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.sortValue ? "cursor-pointer select-none hover:text-brand-600" : ""}
                  onClick={() =>
                    c.sortValue &&
                    setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))
                  }
                >
                  {c.header}
                  {sort?.key === c.key && <span className="ml-1">{sort.dir === 1 ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  className={`transition-colors hover:bg-brand-50/60 dark:hover:bg-slate-800/60 ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${selected.has(id) ? "bg-brand-50 dark:bg-slate-800" : ""}`}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggle(id)}
                        className="accent-brand-600"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} onClick={() => onRowClick?.(row)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400">
                  {t("common.empty")}
                </td>
              </tr>
            )}
          </tbody>
          {footer}
        </table>
      </div>
    </div>
  );
}
