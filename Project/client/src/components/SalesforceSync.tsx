import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Loader2, X } from "lucide-react";
import { api, ApiError } from "../api";
import { ProfileData } from "../types";

interface SyncResult {
  accountId: string;
  contactId: string;
  updated: boolean;
}

/**
 * "Sync to CRM" profile action: collects extra info in a small form and asks
 * the server to create (or update) a Salesforce Account + linked Contact.
 * Rendered only for the profile owner or an admin (data.editable).
 */
export default function SalesforceSync({ data }: { data: ProfileData }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ company: "", phone: "", jobTitle: "", industry: "", website: "", notes: "" });

  const synced = Boolean(data.user.sfAccountId) || result !== null;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<SyncResult>(`/api/salesforce/${data.user.id}/sync`, form);
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.body.error === "not_configured") setError(t("crm.notConfigured"));
      else setError(t("crm.failed", { detail: err instanceof ApiError ? String(err.body.error ?? "") : "" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 p-4 print:hidden">
      <div className="flex items-center gap-2">
        <Cloud size={16} className="text-brand-600" />
        <h2 className="font-semibold">{t("crm.title")}</h2>
        {!open && (
          <button className="btn-primary ml-auto" onClick={() => setOpen(true)}>
            {synced ? t("crm.updateAction") : t("crm.action")}
          </button>
        )}
        {open && (
          <button className="btn-ghost ml-auto !p-1" onClick={() => setOpen(false)} aria-label={t("common.close")}>
            <X size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">{t("crm.hint")}</p>

      {open && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder={t("crm.company")} value={form.company} onChange={set("company")} />
            <input className="input" placeholder={t("crm.phone")} value={form.phone} onChange={set("phone")} />
            <input className="input" placeholder={t("crm.jobTitle")} value={form.jobTitle} onChange={set("jobTitle")} />
            <input className="input" placeholder={t("crm.industry")} value={form.industry} onChange={set("industry")} />
            <input className="input sm:col-span-2" placeholder={t("crm.website")} value={form.website} onChange={set("website")} />
          </div>
          <textarea className="input min-h-16" placeholder={t("crm.notes")} value={form.notes} onChange={set("notes")} />
          <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />} {t("crm.submit")}
          </button>
        </div>
      )}

      {result && (
        <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-200">
          {result.updated ? t("crm.updated") : t("crm.created")}{" "}
          <span className="font-mono text-xs">Account {result.accountId} · Contact {result.contactId}</span>
        </p>
      )}
      {!result && synced && !open && (
        <p className="text-xs text-slate-400">
          {t("crm.alreadySynced")} <span className="font-mono">{data.user.sfAccountId}</span>
        </p>
      )}
      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">{error}</p>}
    </section>
  );
}
