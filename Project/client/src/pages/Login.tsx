import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "blocked" ? "auth.blocked" : params.get("error") ? "auth.failed" : null
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/auth/${mode}`, { email, password, ...(mode === "register" ? { name } : {}) });
      await refresh();
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.body.error === "bad_credentials" ? "auth.badCredentials"
          : err.body.error === "email_taken" ? "auth.emailTaken"
          : err.body.error === "blocked" ? "auth.blocked"
          : "auth.failed"
        );
      }
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">{t("auth.signInTitle")}</h1>

        <div className="space-y-2">
          <a href="/api/auth/google" className="btn w-full justify-center border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"/></svg>
            {t("auth.google")}
          </a>
          <a href="/api/auth/github" className="btn w-full justify-center border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.03 11.03 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.35.77 1.05.77 2.12v3.14c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
            {t("auth.github")}
          </a>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          {t("auth.or")}
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <input className="input" placeholder={t("auth.nameLabel")} value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input className="input" type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p className="text-sm text-red-600">{t(error)}</p>}
          <button className="btn-primary w-full justify-center">
            {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        <button
          className="w-full text-center text-sm text-brand-600 hover:underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>
      </div>
    </div>
  );
}
