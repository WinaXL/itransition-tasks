import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { api } from "../api";
import { Role } from "../types";
import { useAuth } from "../AuthContext";
import DataTable, { Column } from "../components/DataTable";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  blocked: boolean;
  provider: string | null;
  createdAt: string;
  _count: { cvs: number; projects: number };
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminUser[]>([]);

  const load = useCallback(() => {
    void api.get<AdminUser[]>("/api/users").then(setRows);
  }, []);

  useEffect(load, [load]);

  const patchAll = async (selected: AdminUser[], data: { role?: Role; blocked?: boolean }, clear: () => void) => {
    await Promise.all(selected.map((u) => api.patch(`/api/users/${u.id}`, data)));
    clear();
    load();
    // Demoting/blocking yourself takes effect immediately.
    await refresh();
  };

  const removeAll = async (selected: AdminUser[], clear: () => void) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await Promise.all(selected.map((u) => api.del(`/api/users/${u.id}`)));
    clear();
    load();
  };

  const columns: Column<AdminUser>[] = [
    { key: "name", header: t("common.name"), render: (u) => <span className="font-medium">{u.name}</span>, sortValue: (u) => u.name },
    { key: "email", header: t("auth.email"), render: (u) => u.email, sortValue: (u) => u.email },
    {
      key: "role",
      header: t("users.role"),
      render: (u) => (
        <span className={`badge ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" : u.role === "RECRUITER" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {u.role}
        </span>
      ),
      sortValue: (u) => u.role,
    },
    { key: "provider", header: t("users.provider"), render: (u) => u.provider ?? "email" },
    { key: "cvs", header: t("positions.cvs"), render: (u) => u._count.cvs, sortValue: (u) => u._count.cvs },
    {
      key: "blocked",
      header: t("users.blocked"),
      render: (u) => (u.blocked ? <Ban size={15} className="text-red-500" /> : <CircleCheck size={15} className="text-green-500" />),
      sortValue: (u) => String(u.blocked),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("users.title")}</h1>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(u) => u.id}
        onRowClick={(u) => navigate(`/profile/${u.id}`)}
        toolbar={(selected, clear) => (
          <>
            <button className="btn-ghost" disabled={selected.length === 0} onClick={() => void patchAll(selected, { role: "ADMIN" }, clear)}>
              {t("users.makeAdmin")}
            </button>
            <button className="btn-ghost" disabled={selected.length === 0} onClick={() => void patchAll(selected, { role: "RECRUITER" }, clear)}>
              {t("users.makeRecruiter")}
            </button>
            <button className="btn-ghost" disabled={selected.length === 0} onClick={() => void patchAll(selected, { role: "CANDIDATE" }, clear)}>
              {t("users.makeCandidate")}
            </button>
            <button className="btn-ghost" disabled={selected.length === 0} onClick={() => void patchAll(selected, { blocked: true }, clear)}>
              <Ban size={14} /> {t("users.block")}
            </button>
            <button className="btn-ghost" disabled={selected.length === 0} onClick={() => void patchAll(selected, { blocked: false }, clear)}>
              <CircleCheck size={14} /> {t("users.unblock")}
            </button>
            <button className="btn-danger" disabled={selected.length === 0} onClick={() => void removeAll(selected, clear)}>
              <Trash2 size={14} /> {t("common.delete")}
            </button>
          </>
        )}
      />
    </div>
  );
}
