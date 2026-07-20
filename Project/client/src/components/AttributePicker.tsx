import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Search } from "lucide-react";
import { api } from "../api";
import { Attribute, Category } from "../types";
import { localizeAttributeName, localizeCategoryName } from "../localization";

/**
 * Attribute Library picker: prefix lookup, category filter and
 * "recently used" shortcut, as required for large libraries.
 */
export default function AttributePicker({
  exclude,
  onPick,
}: {
  exclude: Set<string>;
  onPick: (attr: Attribute) => void;
}) {
  const { t } = useTranslation();
  const [prefix, setPrefix] = useState("");
  const [category, setCategory] = useState<string>("");
  const [recent, setRecent] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Attribute[]>([]);

  useEffect(() => {
    void api.get<Category[]>("/api/attributes/categories").then(setCategories);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (recent) params.set("recent", "1");
    else {
      if (prefix) params.set("prefix", prefix);
      if (category) params.set("category", category);
    }
    const timer = setTimeout(() => {
      void api.get<Attribute[]>(`/api/attributes?${params}`).then(setItems);
    }, 200);
    return () => clearTimeout(timer);
  }, [prefix, category, recent]);

  return (
    <div className="card p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !pl-8"
            placeholder={t("attrs.searchPrefix")}
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value);
              setRecent(false);
            }}
          />
        </div>
        <select
          className="input !w-auto"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setRecent(false);
          }}
        >
          <option value="">{t("common.all")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{localizeCategoryName(c.name, t)}</option>
          ))}
        </select>
        <button
          type="button"
          className={recent ? "btn-primary" : "btn-ghost"}
          onClick={() => setRecent((v) => !v)}
        >
          <Clock size={14} /> {t("attrs.recent")}
        </button>
      </div>
      <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {items
          .filter((a) => !exclude.has(a.id))
          .map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-brand-50 dark:hover:bg-slate-800 rounded"
                onClick={() => onPick(a)}
              >
                <span className="font-medium">{localizeAttributeName(a.name, t)}</span>
                <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t(`attrs.types.${a.type}`)}
                </span>
                <span className="ml-auto text-xs text-slate-400">{localizeCategoryName(a.category?.name, t)}</span>
              </button>
            </li>
          ))}
        {items.length === 0 && <li className="px-2 py-3 text-sm text-slate-400">{t("common.empty")}</li>}
      </ul>
    </div>
  );
}
