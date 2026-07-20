import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Heart, Loader2, Send, Trash2, X } from "lucide-react";
import { api, ApiError } from "../api";
import { Attribute, CvData } from "../types";
import { useAuth } from "../AuthContext";
import AttributeInput from "../components/AttributeInput";
import Md from "../components/Md";
import { ValueDisplay } from "./Profile";
import { useAutoSave } from "../useAutoSave";
import { localizeAttributeName, localizeCategoryName } from "../localization";

/**
 * The CV is assembled at read time from the profile: editing a value here
 * writes the single master value, so it changes everywhere.
 */
export default function CvPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cv, setCv] = useState<CvData | null>(null);
  const [values, setValues] = useState<Map<string, { value: string; version: number | null }>>(new Map());
  const [editingAttr, setEditingAttr] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState(false);
  const [publishError, setPublishError] = useState<number | null>(null);
  const isRecruiter = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  const load = useCallback(async () => {
    const data = await api.get<CvData>(`/api/cvs/${id}`);
    setCv(data);
    setValues(new Map(data.sections.map((s) => [s.attribute.id, { value: s.value, version: s.version }])));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSaved = useCallback((attributeId: string, version: number) => {
    setValues((prev) => {
      const next = new Map(prev);
      const cur = next.get(attributeId);
      if (cur) next.set(attributeId, { ...cur, version });
      return next;
    });
  }, []);

  const onConflict = useCallback((attributeId: string, currentValue: string, version: number) => {
    setConflictMsg(true);
    setValues((prev) => new Map(prev).set(attributeId, { value: currentValue, version }));
  }, []);

  const { track, flush, status } = useAutoSave(cv?.editable ? cv.user.id : undefined, onSaved, onConflict);

  if (!cv) return <p className="text-slate-400">{t("common.loading")}</p>;

  const setValue = (attr: Attribute, value: string) => {
    const cur = values.get(attr.id);
    setValues((prev) => new Map(prev).set(attr.id, { value, version: cur?.version ?? null }));
    track(attr.id, value, cur?.version ?? null);
  };

  const publish = async () => {
    await flush();
    setPublishError(null);
    try {
      await api.post(`/api/cvs/${cv.id}/publish`);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.body.error === "incomplete") setPublishError(Number(err.body.missing));
    }
  };

  const toggleLike = async () => {
    const res = cv.likedByMe
      ? await api.del<{ likes: number; likedByMe: boolean }>(`/api/cvs/${cv.id}/like`)
      : await api.post<{ likes: number; likedByMe: boolean }>(`/api/cvs/${cv.id}/like`);
    setCv((prev) => prev && { ...prev, likes: res.likes, likedByMe: res.likedByMe });
  };

  const removeCv = async () => {
    if (!confirm(t("common.confirmDelete"))) return;
    await api.del(`/api/cvs/${cv.id}`);
    navigate(`/profile/${cv.user.id}`);
  };

  // Group attributes by category for a structured document.
  const groups = new Map<string, CvData["sections"]>();
  for (const s of cv.sections) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${cv.status === "PUBLISHED" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
          {t(`cv.status.${cv.status}`)}
        </span>
        {cv.editable && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {status === "saving" ? <Loader2 size={12} className="animate-spin" /> : status === "saved" ? <Check size={12} className="text-green-500" /> : null}
          </span>
        )}
        <span className="ml-auto" />
        {isRecruiter && !cv.editable && (
          <button className={cv.likedByMe ? "btn-primary" : "btn-ghost"} onClick={() => void toggleLike()}>
            <Heart size={14} fill={cv.likedByMe ? "currentColor" : "none"} /> {cv.likes}
          </button>
        )}
        {cv.editable && cv.status === "DRAFT" && (
          <button className="btn-primary" onClick={() => void publish()} title={t("cv.publishHint")}>
            <Send size={14} /> {t("cv.publish")}
          </button>
        )}
        {cv.editable && cv.status === "PUBLISHED" && (
          <button className="btn-ghost" onClick={() => void api.post(`/api/cvs/${cv.id}/unpublish`).then(load)}>
            {t("cv.unpublish")}
          </button>
        )}
        {cv.editable && (
          <button className="btn-danger" onClick={() => void removeCv()}>
            <Trash2 size={14} /> {t("cv.deleteCv")}
          </button>
        )}
      </div>

      {publishError !== null && <p className="text-sm text-red-600">{t("cv.incomplete", { n: publishError })}</p>}
      {conflictMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          {t("common.conflict")}
          <button className="ml-auto" onClick={() => setConflictMsg(false)}><X size={14} /></button>
        </div>
      )}

      {/* Rendered document */}
      <article className="card overflow-hidden">
        <header className="border-b border-slate-100 bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-5 text-white dark:border-slate-800">
          <h1 className="text-2xl font-bold">{cv.user.name}</h1>
          <p className="text-sm opacity-90">
            {t("cv.generatedFor")}:{" "}
            <Link to={`/positions/${cv.position.id}`} className="underline">
              {cv.position.title}
            </Link>
            {cv.position.company && ` · ${cv.position.company}`}
            {cv.position.level && ` · ${cv.position.level}`}
          </p>
        </header>

        <div className="space-y-6 px-6 py-5">
          {[...groups.entries()].map(([category, sections]) => (
            <section key={category}>
              <h2 className="mb-3 border-b border-slate-100 pb-1 text-sm font-bold uppercase tracking-wide text-brand-600 dark:border-slate-800">
                {localizeCategoryName(category, t)}
              </h2>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {sections.map((s) => {
                  const current = values.get(s.attribute.id);
                  const empty = !current?.value;
                  const editing = editingAttr === s.attribute.id;
                  return (
                    <div key={s.attribute.id} className={s.attribute.type === "TEXT" ? "sm:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-slate-500">{localizeAttributeName(s.attribute.name, t)}</dt>
                      <dd
                        className={`mt-0.5 rounded-md ${empty && !editing ? "bg-red-50 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900" : ""} ${
                          cv.editable && !editing ? "cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800" : ""
                        } px-1.5 py-1 -mx-1.5 transition-colors`}
                        onClick={() => cv.editable && !editing && setEditingAttr(s.attribute.id)}
                      >
                        {editing ? (
                          <div className="flex items-start gap-1">
                            <div className="flex-1">
                              <AttributeInput attribute={s.attribute} value={current?.value ?? ""} onChange={(v) => setValue(s.attribute, v)} />
                            </div>
                            <button className="btn-ghost !p-1" onClick={(e) => { e.stopPropagation(); setEditingAttr(null); void flush(); }}>
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <ValueDisplay attr={s.attribute} value={current?.value ?? ""} />
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}

          {cv.projects.length > 0 && (
            <section>
              <h2 className="mb-3 border-b border-slate-100 pb-1 text-sm font-bold uppercase tracking-wide text-brand-600 dark:border-slate-800">
                {t("cv.sectionProjects")}
              </h2>
              <ul className="space-y-4">
                {cv.projects.map((p) => (
                  <li key={p.id}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(p.startDate).toLocaleDateString()} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : "…"}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {p.tags.map((pt) => (
                          <span key={pt.tag.id} className="badge bg-brand-100 text-brand-700 dark:bg-slate-700 dark:text-slate-200">{pt.tag.name}</span>
                        ))}
                      </span>
                    </div>
                    {p.description && <div className="mt-1"><Md>{p.description}</Md></div>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
