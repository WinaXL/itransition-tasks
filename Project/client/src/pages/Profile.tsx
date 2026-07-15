import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "../api";
import { Attribute, AttributeValue, ProfileData, Project } from "../types";
import AttributeInput from "../components/AttributeInput";
import AttributePicker from "../components/AttributePicker";
import TagSelect from "../components/TagSelect";
import Md from "../components/Md";
import DataTable, { Column } from "../components/DataTable";
import { useAutoSave } from "../useAutoSave";

export default function Profile() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [data, setData] = useState<ProfileData | null>(null);
  const [values, setValues] = useState<Map<string, { value: string; version: number | null }>>(new Map());
  const [conflictMsg, setConflictMsg] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    const profile = await api.get<ProfileData>(`/api/profile/${userId}`);
    setData(profile);
    setValues(new Map(profile.values.map((v) => [v.attributeId, { value: v.value, version: v.version }])));
  }, [userId]);

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

  const { track, status } = useAutoSave(data?.editable ? userId : undefined, onSaved, onConflict);

  if (!data) return <p className="text-slate-400">{t("common.loading")}</p>;
  const editable = data.editable;

  const setValue = (attr: Attribute, value: string) => {
    const cur = values.get(attr.id);
    setValues((prev) => new Map(prev).set(attr.id, { value, version: cur?.version ?? null }));
    track(attr.id, value, cur?.version ?? null);
  };

  const addAttribute = async (attr: Attribute) => {
    const created = await api.post<AttributeValue>(`/api/profile/${userId}/attributes`, { attributeId: attr.id });
    setData((prev) => prev && { ...prev, values: [...prev.values.filter((v) => v.attributeId !== attr.id), created] });
    setValues((prev) => new Map(prev).set(attr.id, { value: created.value, version: created.version }));
    setShowPicker(false);
  };

  const removeAttribute = async (attributeId: string) => {
    await api.del(`/api/profile/${userId}/attributes/${attributeId}`);
    setData((prev) => prev && { ...prev, values: prev.values.filter((v) => v.attributeId !== attributeId) });
  };

  const libraryValues = data.values.filter((v) => !v.attribute.builtIn);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{data.user.name}</h1>
        {editable && (
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            {status === "saving" ? <Loader2 size={12} className="animate-spin" /> : status === "saved" ? <Check size={12} className="text-green-500" /> : null}
            {status === "saving" ? t("common.saving") : status === "saved" ? t("common.saved") : t("profile.autoSave")}
          </span>
        )}
      </div>

      {conflictMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          {t("common.conflict")}
          <button className="ml-auto" onClick={() => setConflictMsg(false)}><X size={14} /></button>
        </div>
      )}

      {/* Me: built-in attributes, always present */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">{t("profile.me")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.builtIns.map((attr) => (
            <div key={attr.id}>
              <label className="mb-1 block text-xs font-medium text-slate-500">{attr.name}</label>
              {editable ? (
                <AttributeInput attribute={attr} value={values.get(attr.id)?.value ?? ""} onChange={(v) => setValue(attr, v)} />
              ) : (
                <ValueDisplay attr={attr} value={values.get(attr.id)?.value ?? ""} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Info: attributes selected from the library */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center">
          <h2 className="font-semibold">{t("profile.info")}</h2>
          {editable && (
            <button className="btn-ghost ml-auto" onClick={() => setShowPicker((v) => !v)}>
              <Plus size={14} /> {t("profile.addAttribute")}
            </button>
          )}
        </div>
        {showPicker && (
          <AttributePicker exclude={new Set(data.values.map((v) => v.attributeId))} onPick={(a) => void addAttribute(a)} />
        )}
        <div className="space-y-3">
          {libraryValues.map((v) => (
            <div key={v.attributeId} className="group">
              <div className="mb-1 flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500">{v.attribute.name}</label>
                <span className="badge bg-slate-100 text-slate-400 dark:bg-slate-800">{v.attribute.category?.name}</span>
                {editable && (
                  <button
                    className="invisible ml-auto text-slate-400 hover:text-red-500 group-hover:visible"
                    onClick={() => void removeAttribute(v.attributeId)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {editable ? (
                <AttributeInput attribute={v.attribute} value={values.get(v.attributeId)?.value ?? ""} onChange={(val) => setValue(v.attribute, val)} />
              ) : (
                <ValueDisplay attr={v.attribute} value={values.get(v.attributeId)?.value ?? ""} />
              )}
            </div>
          ))}
          {libraryValues.length === 0 && <p className="text-sm text-slate-400">{t("common.empty")}</p>}
        </div>
      </section>

      <ProjectsSection data={data} editable={editable} reload={load} userId={userId!} />
      <CvsSection data={data} />
    </div>
  );
}

export function ValueDisplay({ attr, value }: { attr: Attribute; value: string }) {
  const { t } = useTranslation();
  if (!value) return <span className="text-sm text-red-500">{t("cv.emptyValue")}</span>;
  switch (attr.type) {
    case "TEXT":
      return <Md>{value}</Md>;
    case "IMAGE":
      return <img src={value} alt={attr.name} className="h-24 w-24 rounded-lg object-cover" />;
    case "BOOLEAN":
      return <span className="text-sm">{value === "true" ? t("common.yes") : t("common.no")}</span>;
    case "PERIOD": {
      const [from, to] = value.split("..");
      return <span className="text-sm">{from} — {to || "…"}</span>;
    }
    default:
      return <span className="text-sm">{value}</span>;
  }
}

function ProjectsSection({ data, editable, reload, userId }: { data: ProfileData; editable: boolean; reload: () => Promise<void>; userId: string }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [conflict, setConflict] = useState(false);

  const remove = async (project: Project) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await api.del(`/api/profile/${userId}/projects/${project.id}`);
    await reload();
  };

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center">
        <h2 className="font-semibold">{t("profile.projects")}</h2>
        {editable && (
          <button className="btn-ghost ml-auto" onClick={() => setEditing("new")}>
            <Plus size={14} /> {t("profile.project.new")}
          </button>
        )}
      </div>
      {conflict && <p className="text-sm text-amber-600">{t("common.conflict")}</p>}
      {editing && (
        <ProjectForm
          userId={userId}
          project={editing === "new" ? null : editing}
          onDone={async (hadConflict) => {
            setConflict(hadConflict);
            setEditing(null);
            await reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <ul className="space-y-3">
        {data.projects.map((p) => (
          <li key={p.id} className="group rounded-lg border border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-slate-400">
                {new Date(p.startDate).toLocaleDateString()} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : "…"}
              </span>
              {editable && (
                <span className="invisible ml-auto flex gap-1 group-hover:visible">
                  <button className="btn-ghost !p-1" onClick={() => setEditing(p)}><Pencil size={13} /></button>
                  <button className="btn-ghost !p-1 hover:!text-red-500" onClick={() => void remove(p)}><Trash2 size={13} /></button>
                </span>
              )}
            </div>
            {p.description && <div className="mt-1"><Md>{p.description}</Md></div>}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {p.tags.map((pt) => (
                <span key={pt.tag.id} className="badge bg-brand-100 text-brand-700 dark:bg-slate-700 dark:text-slate-200">{pt.tag.name}</span>
              ))}
            </div>
          </li>
        ))}
        {data.projects.length === 0 && !editing && <p className="text-sm text-slate-400">{t("common.empty")}</p>}
      </ul>
    </section>
  );
}

function ProjectForm({
  userId, project, onDone, onCancel,
}: {
  userId: string;
  project: Project | null;
  onDone: (hadConflict: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(project?.name ?? "");
  const [start, setStart] = useState(project ? project.startDate.slice(0, 10) : "");
  const [end, setEnd] = useState(project?.endDate ? project.endDate.slice(0, 10) : "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [tags, setTags] = useState<string[]>(project?.tags.map((pt) => pt.tag.name) ?? []);

  const save = async () => {
    const body = { name, startDate: start, endDate: end || null, description, tags };
    try {
      if (project) await api.patch(`/api/profile/${userId}/projects/${project.id}`, { ...body, version: project.version });
      else await api.post(`/api/profile/${userId}/projects`, body);
      await onDone(false);
    } catch {
      await onDone(true);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-brand-200 p-3 dark:border-slate-700">
      <input className="input" placeholder={t("profile.project.name")} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-xs text-slate-500">{t("profile.project.start")}</label>
        <input type="date" className="input !w-auto" value={start} onChange={(e) => setStart(e.target.value)} />
        <label className="text-xs text-slate-500">{t("profile.project.end")}</label>
        <input type="date" className="input !w-auto" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <textarea className="input min-h-20" placeholder={t("profile.project.description")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <TagSelect value={tags} onChange={setTags} placeholder={t("profile.project.tags")} />
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void save()} disabled={!name.trim() || !start}>{t("common.save")}</button>
        <button className="btn-ghost" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

function CvsSection({ data }: { data: ProfileData }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const columns: Column<ProfileData["cvs"][number]>[] = [
    { key: "position", header: t("positions.title"), render: (cv) => <span className="font-medium">{cv.position.title}</span>, sortValue: (cv) => cv.position.title },
    { key: "company", header: t("positions.company"), render: (cv) => cv.position.company },
    {
      key: "status",
      header: t("positions.access"),
      render: (cv) => (
        <span className={`badge ${cv.status === "PUBLISHED" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
          {t(`cv.status.${cv.status}`)}
        </span>
      ),
    },
    { key: "likes", header: t("positions.likes"), render: (cv) => cv._count.likes, sortValue: (cv) => cv._count.likes },
    { key: "updated", header: t("positions.updated"), render: (cv) => new Date(cv.updatedAt).toLocaleDateString(), sortValue: (cv) => cv.updatedAt },
  ];

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{t("profile.cvs")}</h2>
      {data.cvs.length === 0 ? (
        <p className="text-sm text-slate-400">{t("profile.noCvs")} <Link to="/positions" className="text-brand-600 underline">{t("nav.positions")}</Link></p>
      ) : (
        <DataTable rows={data.cvs} columns={columns} rowKey={(cv) => cv.id} selectable={false} onRowClick={(cv) => navigate(`/cvs/${cv.id}`)} />
      )}
    </section>
  );
}
