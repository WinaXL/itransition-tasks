import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus, X } from "lucide-react";
import { api, ApiError } from "../api";
import { AccessRule, Attribute, Position } from "../types";
import AttributePicker from "../components/AttributePicker";
import TagSelect from "../components/TagSelect";

const OPERATORS_BY_TYPE: Record<string, string[]> = {
  STRING: ["eq", "neq", "contains"],
  TEXT: ["contains"],
  NUMERIC: ["eq", "neq", "gt", "gte", "lt", "lte"],
  DATE: ["eq", "gt", "gte", "lt", "lte"],
  BOOLEAN: ["checked", "unchecked"],
  SELECT: ["eq", "neq"],
  IMAGE: [],
  PERIOD: [],
};

export default function PositionEdit() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [company, setCompany] = useState("");
  const [level, setLevel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxProjects, setMaxProjects] = useState(3);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [rules, setRules] = useState<AccessRule[]>([]);
  const [version, setVersion] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.get<Position>(`/api/positions/${id}`).then((p) => {
      setTitle(p.title);
      setShortDescription(p.shortDescription);
      setCompany(p.company);
      setLevel(p.level);
      setIsPublic(p.isPublic);
      setMaxProjects(p.maxProjects);
      setAttributes(p.attributes?.map((a) => a.attribute) ?? []);
      setProjectTags(p.projectTags?.map((pt) => pt.tag.name) ?? []);
      setRules(p.accessRules?.map((r) => ({ attributeId: r.attributeId, operator: r.operator, value: r.value, attribute: r.attribute })) ?? []);
      setVersion(p.version);
    });
  }, [id]);

  const save = async () => {
    setError(null);
    const body = {
      title, shortDescription, company, level, isPublic, maxProjects,
      attributeIds: attributes.map((a) => a.id),
      projectTags,
      accessRules: rules.filter((r) => r.attributeId && r.operator).map(({ attributeId, operator, value }) => ({ attributeId, operator, value })),
    };
    try {
      const saved = isNew
        ? await api.post<Position>("/api/positions", body)
        : await api.patch<Position>(`/api/positions/${id}`, { ...body, version });
      navigate(`/positions/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("common.conflict"));
        const fresh = await api.get<Position>(`/api/positions/${id}`);
        setVersion(fresh.version);
      } else setError(t("auth.failed"));
    }
  };

  const ruleAttrs = attributes.filter((a) => (OPERATORS_BY_TYPE[a.type] ?? []).length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">{isNew ? t("positions.newPosition") : `${t("common.edit")}: ${title}`}</h1>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t("positions.basicInfo")}</h2>
        <input className="input" placeholder={t("common.name")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input min-h-20" placeholder={t("common.description")} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder={t("positions.company")} value={company} onChange={(e) => setCompany(e.target.value)} />
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">{t("positions.level")}…</option>
            {["Junior", "Middle", "Senior", "C-level"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            {t("positions.public")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t("positions.maxProjects")}
            <input type="number" min={0} max={20} className="input !w-20" value={maxProjects} onChange={(e) => setMaxProjects(Number(e.target.value))} />
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("positions.attributes")}</h2>
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {attributes.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <GripVertical size={14} className="text-slate-300" />
              <span className="font-medium">{a.name}</span>
              <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t(`attrs.types.${a.type}`)}</span>
              {a.builtIn && <span className="badge bg-brand-100 text-brand-700">{t("attrs.builtIn")}</span>}
              <button className="btn-ghost ml-auto !p-1" onClick={() => setAttributes((prev) => prev.filter((x) => x.id !== a.id))}>
                <X size={14} />
              </button>
            </li>
          ))}
          {attributes.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">{t("common.empty")}</li>}
        </ul>
        <AttributePicker exclude={new Set(attributes.map((a) => a.id))} onPick={(a) => setAttributes((prev) => [...prev, a])} />
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="font-semibold">{t("positions.projectTags")}</h2>
        <TagSelect value={projectTags} onChange={setProjectTags} placeholder={t("profile.project.tags")} />
      </section>

      {!isPublic && (
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">{t("positions.accessRules")}</h2>
          {rules.map((rule, i) => {
            const attr = ruleAttrs.find((a) => a.id === rule.attributeId);
            const ops = attr ? OPERATORS_BY_TYPE[attr.type] : [];
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  className="input !w-auto flex-1 min-w-32"
                  value={rule.attributeId}
                  onChange={(e) => setRules((prev) => prev.map((r, j) => (j === i ? { ...r, attributeId: e.target.value, operator: "" } : r)))}
                >
                  <option value="">{t("positions.attributes")}…</option>
                  {ruleAttrs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select
                  className="input !w-auto"
                  value={rule.operator}
                  onChange={(e) => setRules((prev) => prev.map((r, j) => (j === i ? { ...r, operator: e.target.value } : r)))}
                >
                  <option value="">{t("positions.operator")}…</option>
                  {ops.map((o) => <option key={o}>{o}</option>)}
                </select>
                {!["checked", "unchecked"].includes(rule.operator) &&
                  (attr?.type === "SELECT" ? (
                    <select
                      className="input !w-auto"
                      value={rule.value}
                      onChange={(e) => setRules((prev) => prev.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                    >
                      <option value="">{t("positions.value")}…</option>
                      {attr.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      className="input !w-32"
                      placeholder={t("positions.value")}
                      value={rule.value}
                      onChange={(e) => setRules((prev) => prev.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                    />
                  ))}
                <button className="btn-ghost !p-1" onClick={() => setRules((prev) => prev.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button className="btn-ghost" onClick={() => setRules((prev) => [...prev, { attributeId: "", operator: "", value: "" }])}>
            <Plus size={14} /> {t("positions.addRule")}
          </button>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void save()} disabled={!title.trim()}>{t("common.save")}</button>
        <button className="btn-ghost" onClick={() => navigate(-1)}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}
