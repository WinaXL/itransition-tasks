import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TagCloud } from "react-tagcloud";
import { api } from "../api";
import { Position } from "../types";
import { useAuth } from "../AuthContext";
import DataTable, { Column } from "../components/DataTable";

interface HomeData {
  latest: Position[];
  popular: Position[];
  stats: { cvsLast24h: number; totalCvs: number; totalPositions: number; totalCandidates: number; totalRecruiters: number };
  tags: { id: number; name: string; weight: number }[];
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    void api.get<HomeData>("/api/home").then(setData);
  }, []);

  if (!data) return <p className="text-slate-400">{t("common.loading")}</p>;

  const columns: Column<Position>[] = [
    { key: "title", header: t("common.name"), render: (p) => <span className="font-medium">{p.title}</span>, sortValue: (p) => p.title },
    { key: "company", header: t("positions.company"), render: (p) => p.company, sortValue: (p) => p.company },
    { key: "level", header: t("positions.level"), render: (p) => p.level },
    { key: "cvs", header: t("positions.cvs"), render: (p) => p._count?.cvs ?? 0, sortValue: (p) => p._count?.cvs ?? 0 },
  ];

  const stats = [
    [t("home.cvs24h"), data.stats.cvsLast24h],
    [t("home.totalCvs"), data.stats.totalCvs],
    [t("home.totalPositions"), data.stats.totalPositions],
    [t("home.candidates"), data.stats.totalCandidates],
    [t("home.recruiters"), data.stats.totalRecruiters],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="card px-4 py-3">
            <div className="text-2xl font-bold text-brand-600">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("home.latest")}</h2>
          <DataTable
            rows={data.latest}
            columns={columns}
            rowKey={(p) => p.id}
            selectable={false}
            onRowClick={(p) => navigate(`/positions/${p.id}`)}
          />
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t("home.popular")}</h2>
          <DataTable
            rows={data.popular}
            columns={columns}
            rowKey={(p) => p.id}
            selectable={false}
            onRowClick={(p) => navigate(`/positions/${p.id}`)}
          />
        </section>
      </div>

      {data.tags.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-lg font-semibold">{t("home.tags")}</h2>
          <TagCloud
            minSize={14}
            maxSize={34}
            tags={data.tags.map((tag) => ({ value: tag.name, count: tag.weight }))}
            onClick={(tag: { value: string }) =>
              // Tags lead recruiters to CV search, candidates/guests to positions.
              navigate(
                user && (user.role === "RECRUITER" || user.role === "ADMIN")
                  ? `/search?q=${encodeURIComponent(tag.value)}`
                  : `/positions?q=${encodeURIComponent(tag.value)}`
              )
            }
            className="cursor-pointer text-center [&>span]:m-1 [&>span]:inline-block [&>span]:text-brand-600 [&>span:hover]:underline"
            disableRandomColor
          />
        </section>
      )}

      {!user && (
        <p className="text-center text-sm text-slate-500">
          <Link to="/login" className="text-brand-600 underline">{t("nav.login")}</Link> — {t("app.tagline")}
        </p>
      )}
    </div>
  );
}
