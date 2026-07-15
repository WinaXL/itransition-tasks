import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (lang: "en" | "ru") => void;
  setTheme: (theme: "light" | "dark") => void;
  theme: "light" | "dark";
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const refresh = async () => {
    const me = await api.get<User | null>("/api/auth/me");
    setUser(me);
    if (me) {
      i18n.changeLanguage(me.language);
      localStorage.setItem("lang", me.language);
      setThemeState(me.theme);
      localStorage.setItem("theme", me.theme);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = (lang: "en" | "ru") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    if (user) void api.patch("/api/auth/prefs", { language: lang });
  };

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    if (user) void api.patch("/api/auth/prefs", { theme: t });
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, refresh, logout, setLanguage, setTheme, theme }}>{children}</Ctx.Provider>
  );
}
