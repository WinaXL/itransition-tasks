import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { api } from "../api";
import { PageMeta } from "../types";
import { localizeAttributeName } from "../localization";
import Pagination from "../components/Pagination";

interface Results {
  positions: { items: { id: string; title: string; company: string; shortdescription: string }[]; total: number };
  attributes: { items: { id: string; name: string; description: string }[]; total: number };
  cvs: { items: { id: string; userName: string; positionTitle: string; likes: number }[]; total: number };
  meta: PageMeta;
}

export default function SearchResults() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => setPage(1), [q]);

  useEffect(() => {
    void api.get<Results>(`/api/search?q=${encodeURIComponent(q)}&page=${page}`).then(setResults);
  }, [q, page]);

  if (!results) return <p className="text-slate-400">{t("common.loading")}</p>;
  const total = results.positions.total + results.attributes.total + results.cvs.total;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">{t("search.results", { q })}</h1>
      {total === 0 && <p className="text-slate-400">{t("search.nothing")}</p>}

      {results.positions.items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            {t("search.positions")} <span className="font-normal text-slate-400">({results.positions.total})</span>
          </h2>
          {results.positions.items.map((p) => (
            <button key={p.id} className="card block w-full p-3 text-left hover:border-brand-500" onClick={() => navigate(`/positions/${p.id}`)}>
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-slate-500">{p.company} {p.shortdescription && `— ${p.shortdescription.slice(0, 120)}`}</div>
            </button>
          ))}
        </section>
      )}

      {results.cvs.items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            {t("search.cvs")} <span className="font-normal text-slate-400">({results.cvs.total})</span>
          </h2>
          {results.cvs.items.map((cv) => (
            <button key={cv.id} className="card flex w-full items-center gap-2 p-3 text-left hover:border-brand-500" onClick={() => navigate(`/cvs/${cv.id}`)}>
              <span className="font-medium">{cv.userName}</span>
              <span className="text-sm text-slate-500">{cv.positionTitle}</span>
              <span className="ml-auto flex items-center gap-1 text-sm text-slate-400"><Heart size={13} /> {cv.likes}</span>
            </button>
          ))}
        </section>
      )}

      {results.attributes.items.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            {t("search.attributes")} <span className="font-normal text-slate-400">({results.attributes.total})</span>
          </h2>
          {results.attributes.items.map((a) => (
            <div key={a.id} className="card p-3">
              <span className="font-medium">{localizeAttributeName(a.name, t)}</span>
              <span className="ml-2 text-sm text-slate-500">{a.description}</span>
            </div>
          ))}
        </section>
      )}

      <Pagination meta={results.meta} onChange={setPage} />
    </div>
  );
}
