import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../api";
import { Attribute, AttributeType, Category } from "../types";
import DataTable, { Column } from "../components/DataTable";
import { localizeAttributeName, localizeCategoryName } from "../localization";

const TYPES: AttributeType[] = ["STRING", "TEXT", "IMAGE", "NUMERIC", "DATE", "PERIOD", "BOOLEAN", "SELECT"];

export default function AttributesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Attribute | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void api.get<Attribute[]>("/api/attributes").then(setRows);
  }, []);

  useEffect(() => {
    load();
    void api.get<Category[]>("/api/attributes/categories").then(setCategories);
  }, [load]);

  const remove = async (selected: Attribute[], clear: () => void) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await Promise.all(selected.filter((a) => !a.builtIn).map((a) => api.del(`/api/attributes/${a.id}`)));
    clear();
    load();
  };

  const columns: Column<Attribute>[] = [
    {
      key: "name",
      header: t("common.name"),
      render: (a) => (
        <span className="font-medium">
          {localizeAttributeName(a.name, t)} {a.builtIn && <span className="badge bg-brand-100 text-brand-700 ml-1">{t("attrs.builtIn")}</span>}
        </span>
      ),
      sortValue: (a) => a.name,
    },
    { key: "type", header: t("common.type"), render: (a) => t(`attrs.types.${a.type}`), sortValue: (a) => a.type },
    { key: "category", header: t("common.category"), render: (a) => localizeCategoryName(a.category?.name, t), sortValue: (a) => a.category?.name ?? "" },
    { key: "description", header: t("common.description"), render: (a) => <span className="line-clamp-1 max-w-md text-slate-500">{a.description}</span> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("attrs.title")}</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {editing && (
        <AttrForm
          attr={editing === "new" ? null : editing}
          categories={categories}
          onDone={(msg) => {
            setError(msg);
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        toolbar={(selected, clear) => (
          <>
            <button className="btn-primary" onClick={() => setEditing("new")}>
              <Plus size={14} /> {t("attrs.newAttribute")}
            </button>
            <button className="btn-ghost" disabled={selected.length !== 1} onClick={() => setEditing(selected[0])}>
              <Pencil size={14} /> {t("common.edit")}
            </button>
            <button
              className="btn-danger"
              disabled={selected.length === 0 || selected.some((a) => a.builtIn)}
              onClick={() => void remove(selected, clear)}
            >
              <Trash2 size={14} /> {t("common.delete")}
            </button>
          </>
        )}
      />
    </div>
  );
}

function AttrForm({
  attr, categories, onDone, onCancel,
}: {
  attr: Attribute | null;
  categories: Category[];
  onDone: (error: string | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(attr?.name ?? "");
  const [description, setDescription] = useState(attr?.description ?? "");
  const [type, setType] = useState<AttributeType>(attr?.type ?? "STRING");
  const [categoryId, setCategoryId] = useState<number>(attr?.categoryId ?? categories[0]?.id ?? 1);
  const [options, setOptions] = useState(attr?.options.join("\n") ?? "");

  const save = async () => {
    const body = {
      name, description, type, categoryId,
      options: type === "SELECT" ? options.split("\n").map((o) => o.trim()).filter(Boolean) : [],
    };
    try {
      if (attr) await api.patch(`/api/attributes/${attr.id}`, { ...body, version: attr.version });
      else await api.post("/api/attributes", body);
      onDone(null);
    } catch (err) {
      onDone(err instanceof ApiError && err.status === 409
        ? err.body.error === "name_taken" ? `${t("common.name")}: ${name} — ${t("auth.emailTaken")}` : t("common.conflict")
        : t("auth.failed"));
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder={t("common.name")} value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={type} disabled={Boolean(attr)} onChange={(e) => setType(e.target.value as AttributeType)}>
          {TYPES.map((tp) => <option key={tp} value={tp}>{t(`attrs.types.${tp}`)}</option>)}
        </select>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          {categories.map((c) => <option key={c.id} value={c.id}>{localizeCategoryName(c.name, t)}</option>)}
        </select>
        <input className="input" placeholder={t("common.description")} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {type === "SELECT" && (
        <textarea className="input min-h-20" placeholder={t("attrs.options")} value={options} onChange={(e) => setOptions(e.target.value)} />
      )}
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void save()} disabled={!name.trim()}>{t("common.save")}</button>
        <button className="btn-ghost" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}
