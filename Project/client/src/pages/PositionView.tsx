import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, FilePlus2, Heart } from "lucide-react";
import { api } from "../api";
import { Comment, Position } from "../types";
import { useAuth } from "../AuthContext";
import Md from "../components/Md";
import DataTable, { Column } from "../components/DataTable";
import { localizeAttributeName } from "../localization";

type Tab = "overview" | "cvs" | "discussion";

interface CvTable {
  columns: { id: string; name: string; type: string }[];
  averages: Record<string, number | null>;
  rows: { cvId: string; userId: string; userName: string; likes: number; updatedAt: string; values: Record<string, string> }[];
}

export default function PositionView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [position, setPosition] = useState<Position | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const isRecruiter = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  useEffect(() => {
    void api.get<Position>(`/api/positions/${id}`).then(setPosition);
  }, [id]);

  if (!position) return <p className="text-slate-400">{t("common.loading")}</p>;

  const createCv = async () => {
    const cv = await api.post<{ id: string }>("/api/cvs", { positionId: position.id });
    navigate(`/cvs/${cv.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold">{position.title}</h1>
          <p className="text-sm text-slate-500">
            {[position.company, position.level].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {user && !isRecruiter && position.accessible && (
            position.myCvId ? (
              <Link to={`/cvs/${position.myCvId}`} className="btn-primary"><FilePlus2 size={14} /> {t("positions.openCv")}</Link>
            ) : (
              <button className="btn-primary" onClick={() => void createCv()}><FilePlus2 size={14} /> {t("positions.createCv")}</button>
            )
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["overview", ...(isRecruiter ? ["cvs" as Tab] : []), "discussion"] as Tab[]).map((tb) => (
          <button
            key={tb}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === tb ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
            onClick={() => setTab(tb)}
          >
            {tb === "overview" ? t("positions.overview") : tb === "cvs" ? t("positions.cvsTab") : t("positions.discussion")}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview position={position} />}
      {tab === "cvs" && isRecruiter && <CvsTab positionId={position.id} />}
      {tab === "discussion" && <Discussion positionId={position.id} />}
    </div>
  );
}

function Overview({ position }: { position: Position }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card p-4 lg:col-span-2">
        <Md>{position.shortDescription || "—"}</Md>
      </div>
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-500">{t("positions.attributes")}</h3>
          <ul className="space-y-1 text-sm">
            {position.attributes?.map((pa) => (
              <li key={pa.attribute.id} className="flex items-center gap-2">
                <span>{localizeAttributeName(pa.attribute.name, t)}</span>
                <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t(`attrs.types.${pa.attribute.type}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {(position.projectTags?.length ?? 0) > 0 && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{t("positions.projectTags")}</h3>
            <div className="flex flex-wrap gap-1">
              {position.projectTags!.map((pt) => (
                <span key={pt.tag.id} className="badge bg-brand-100 text-brand-700">{pt.tag.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CvsTab({ positionId }: { positionId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<CvTable | null>(null);

  useEffect(() => {
    void api.get<CvTable>(`/api/positions/${positionId}/cvs`).then(setData);
  }, [positionId]);

  if (!data) return <p className="text-slate-400">{t("common.loading")}</p>;
  if (data.rows.length === 0) return <p className="text-slate-400">{t("positions.noCvs")}</p>;

  const columns: Column<CvTable["rows"][number]>[] = [
    {
      key: "user",
      header: t("positions.candidate"),
      render: (r) => <span className="font-medium">{r.userName}</span>,
      sortValue: (r) => r.userName,
    },
    ...data.columns.map((c) => ({
      key: c.id,
      header: localizeAttributeName(c.name, t),
      render: (r: CvTable["rows"][number]) =>
        r.values[c.id] ? (
          c.type === "BOOLEAN" ? (r.values[c.id] === "true" ? "✓" : "✗") : <span className="line-clamp-1 max-w-48">{r.values[c.id]}</span>
        ) : (
          <span className="text-red-500">—</span>
        ),
      sortValue: (r: CvTable["rows"][number]) => r.values[c.id] ?? "",
    })),
    {
      key: "likes",
      header: <Heart size={14} className="inline" />,
      render: (r) => r.likes,
      sortValue: (r) => r.likes,
    },
  ];

  return (
    <DataTable
      rows={data.rows}
      columns={columns}
      rowKey={(r) => r.cvId}
      selectable={false}
      onRowClick={(r) => navigate(`/cvs/${r.cvId}`)}
      toolbar={() => (
        <a className="btn-ghost" href={`/api/positions/${positionId}/cvs.csv`}>
          <Download size={14} /> {t("common.download")}
        </a>
      )}
      footer={
        Object.keys(data.averages).length > 0 ? (
          <tfoot>
            <tr className="bg-slate-50 dark:bg-slate-800/50 font-medium">
              <td />
              <td>{t("positions.average")}</td>
              {data.columns.map((c) => (
                <td key={c.id}>{data.averages[c.id] != null ? data.averages[c.id]!.toFixed(2) : ""}</td>
              ))}
              <td />
            </tr>
          </tfoot>
        ) : undefined
      }
    />
  );
}

function Discussion({ positionId }: { positionId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const lastRef = useRef<string | null>(null);
  const isRecruiter = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  // New posts appear for all viewers within a few seconds via polling.
  const poll = useCallback(async () => {
    const fresh = await api.get<Comment[]>(
      `/api/positions/${positionId}/comments${lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : ""}`
    );
    if (fresh.length > 0) {
      lastRef.current = fresh[fresh.length - 1].createdAt;
      setComments((prev) => [...prev, ...fresh]);
    }
  }, [positionId]);

  useEffect(() => {
    lastRef.current = null;
    setComments([]);
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => clearInterval(timer);
  }, [poll]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/api/positions/${positionId}/comments`, { text });
    setText("");
    await poll();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="card p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
              {isRecruiter ? (
                <Link to={`/profile/${c.author.id}`} className="font-semibold text-brand-600 hover:underline">{c.author.name}</Link>
              ) : (
                <span className="font-semibold">{c.author.name}</span>
              )}
              <span>{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <Md>{c.text}</Md>
          </li>
        ))}
        {comments.length === 0 && <li className="text-sm text-slate-400">{t("common.empty")}</li>}
      </ul>
      {user && (
        <form onSubmit={submit} className="flex gap-2">
          <textarea
            className="input min-h-16 flex-1"
            placeholder={t("positions.writeComment")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary self-end">{t("positions.send")}</button>
        </form>
      )}
    </div>
  );
}
