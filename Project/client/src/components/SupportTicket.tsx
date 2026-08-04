import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { api, ApiError } from "../api";

const PRIORITIES = ["High", "Average", "Low"] as const;
type Priority = (typeof PRIORITIES)[number];

/**
 * Support ticket dialog (Power Automate integration): asks for a summary and
 * priority, then the server uploads a JSON ticket to Dropbox where a cloud
 * flow picks it up, e-mails the admins and sends a mobile notification.
 */
export default function SupportTicket({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState<Priority>("Average");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ ok: boolean; file: string }>("/api/support/tickets", {
        summary,
        priority,
        link: window.location.href,
      });
      setDone(res.file);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t("support.signInFirst"));
      else if (err instanceof ApiError && err.body.error === "not_configured") setError(t("support.notConfigured"));
      else setError(t("support.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center">
          <h2 className="font-semibold">{t("support.title")}</h2>
          <button className="btn-ghost ml-auto !p-1" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-200">
              {t("support.success")}
            </p>
            <button className="btn-primary w-full justify-center" onClick={onClose}>{t("common.close")}</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400">{t("support.hint")}</p>
            <textarea
              className="input min-h-24"
              placeholder={t("support.summary")}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">{t("support.priority")}</label>
              <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`support.priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">{error}</p>}
            <button className="btn-primary w-full justify-center" onClick={() => void submit()} disabled={busy || !summary.trim()}>
              {busy && <Loader2 size={14} className="animate-spin" />} {t("support.submit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
