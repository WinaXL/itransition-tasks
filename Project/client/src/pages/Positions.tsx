import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { PageMeta, Paginated, Position } from "../types";
import { useAuth } from "../AuthContext";
import DataTable, { Column } from "../components/DataTable";
import Pagination from "../components/Pagination";

export default function Positions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Position[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PageMeta | null>(null);

  const isRecruiter = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  const load = useCallback(() => {
    const query = new URLSearchParams({ page: String(page) });
    const q = params.get("q");
    if (q) query.set("q", q);
    void api.get<Paginated<Position>>(`/api/positions?${query}`).then(({ items, meta: m }) => {
      setRows(items);
      setMeta(m);
      // e.g. after deleting the last row of the final page
      if (page > m.pages) setPage(m.pages);
    });
  }, [params, page]);

  useEffect(load, [load]);

  const columns: Column<Position>[] = [
    { key: "title", header: t("common.name"), render: (p) => <span className="font-medium">{p.title}</span>, sortValue: (p) => p.title },
    { key: "company", header: t("positions.company"), render: (p) => p.company, sortValue: (p) => p.company },
    { key: "level", header: t("positions.level"), render: (p) => p.level, sortValue: (p) => p.level },
    {
      key: "access",
      header: t("positions.access"),
      render: (p) => (
        <span className={`badge ${p.isPublic ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
          {p.isPublic ? t("positions.public") : t("positions.restricted")}
        </span>
      ),
    },
    { key: "cvs", header: t("positions.cvs"), render: (p) => p.cvCount ?? 0, sortValue: (p) => p.cvCount ?? 0 },
    {
      key: "updated",
      header: t("positions.updated"),
      render: (p) => new Date(p.updatedAt).toLocaleDateString(),
      sortValue: (p) => p.updatedAt,
    },
  ];

  const remove = async (selected: Position[], clear: () => void) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await Promise.all(selected.map((p) => api.del(`/api/positions/${p.id}`)));
    clear();
    load();
  };

  const duplicate = async (p: Position, clear: () => void) => {
    await api.post(`/api/positions/${p.id}/duplicate`);
    clear();
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("positions.title")}</h1>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        selectable={Boolean(isRecruiter)}
        onRowClick={(p) => navigate(`/positions/${p.id}`)}
        toolbar={
          isRecruiter
            ? (selected, clear) => (
                <>
                  <button className="btn-primary" onClick={() => navigate("/positions/new")}>
                    <Plus size={14} /> {t("positions.newPosition")}
                  </button>
                  <button className="btn-ghost" disabled={selected.length !== 1} onClick={() => navigate(`/positions/${selected[0].id}/edit`)}>
                    <Pencil size={14} /> {t("common.edit")}
                  </button>
                  <button className="btn-ghost" disabled={selected.length !== 1} onClick={() => void duplicate(selected[0], clear)}>
                    <Copy size={14} /> {t("common.duplicate")}
                  </button>
                  <button className="btn-danger" disabled={selected.length === 0} onClick={() => void remove(selected, clear)}>
                    <Trash2 size={14} /> {t("common.delete")}
                  </button>
                </>
              )
            : undefined
        }
      />
      {meta && <Pagination meta={meta} onChange={setPage} />}
    </div>
  );
}
