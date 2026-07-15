import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { api } from "../api";

interface Results {
  positions: { id: string; title: string; company: string; shortdescription: string }[];
  attributes: { id: string; name: string; description: string }[];
  cvs: { id: string; userName: string; positionTitle: string; likes: number }[];
}

export default function SearchResults() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    void api.get<Results>(`/api/search?q=${encodeURIComponent(q)}`).then(setResults);
  }, [q]);

  if (!results) return <p className="text-slate-400">{t("common.loading")}</p>;
  const total = results.positions.length + results.attributes.length + results.cvs.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">{t("search.results", { q })}</h1>
      {total === 0 && <p className="text-slate-400">{t("search.nothing")}</p>}

      {results.positions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">{t("search.positions")}</h2>
          {results.positions.map((p) => (
            <button key={p.id} className="card block w-full p-3 text-left hover:border-brand-500" onClick={() => navigate(`/positions/${p.id}`)}>
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-slate-500">{p.company} {p.shortdescription && `— ${p.shortdescription.slice(0, 120)}`}</div>
            </button>
          ))}
        </section>
      )}

      {results.cvs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">{t("search.cvs")}</h2>
          {results.cvs.map((cv) => (
            <button key={cv.id} className="card flex w-full items-center gap-2 p-3 text-left hover:border-brand-500" onClick={() => navigate(`/cvs/${cv.id}`)}>
              <span className="font-medium">{cv.userName}</span>
              <span className="text-sm text-slate-500">{cv.positionTitle}</span>
              <span className="ml-auto flex items-center gap-1 text-sm text-slate-400"><Heart size={13} /> {cv.likes}</span>
            </button>
          ))}
        </section>
      )}

      {results.attributes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-slate-500">{t("search.attributes")}</h2>
          {results.attributes.map((a) => (
            <div key={a.id} className="card p-3">
              <span className="font-medium">{a.name}</span>
              <span className="ml-2 text-sm text-slate-500">{a.description}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
