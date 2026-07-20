import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Moon, Search, Sun, Menu, X } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout, setLanguage, setTheme, theme } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setMenuOpen(false);
    }
  };

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const renderLinks = () => (
    <>
      <NavLink to="/" className={navLink} end onClick={() => setMenuOpen(false)}>{t("nav.home")}</NavLink>
      <NavLink to="/positions" className={navLink} onClick={() => setMenuOpen(false)}>{t("nav.positions")}</NavLink>
      {user && (user.role === "RECRUITER" || user.role === "ADMIN") && (
        <NavLink to="/attributes" className={navLink} onClick={() => setMenuOpen(false)}>{t("nav.attributes")}</NavLink>
      )}
      {user && <NavLink to={`/profile/${user.id}`} className={navLink} onClick={() => setMenuOpen(false)}>{t("nav.profile")}</NavLink>}
      {user?.role === "ADMIN" && <NavLink to="/users" className={navLink} onClick={() => setMenuOpen(false)}>{t("nav.users")}</NavLink>}
    </>
  );

  const searchForm = (mobile = false) => (
    <form onSubmit={submitSearch} className={`relative ${mobile ? "w-full" : "ml-auto w-full max-w-xs"}`}>
      <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("nav.search")}
        className="input !pl-8"
      />
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand-600">
            <FileText size={20} />
            <span>{t("app.name")}</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">{renderLinks()}</nav>

          <div className="ml-auto hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex">
            {searchForm()}
            <button className="btn-ghost !px-2" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Theme">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <select
              value={i18n.language}
              onChange={(e) => setLanguage(e.target.value as "en" | "ru")}
              className="input !w-auto !py-1"
              aria-label="Language"
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
            </select>

            {user ? (
              <div className="flex items-center gap-2">
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {user.name[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-28 truncate text-sm font-medium">{user.name}</span>
                </Link>
                <button className="btn-ghost" onClick={() => void logout().then(() => navigate("/"))}>
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary">{t("nav.login")}</Link>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost ml-auto !px-2 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="absolute inset-x-0 top-full max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-xl dark:border-slate-800 dark:bg-slate-950 lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">{renderLinks()}</nav>
            <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              {searchForm(true)}
              <div className="flex items-center gap-2">
                <button className="btn-ghost flex-1 justify-center" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                  {theme === "dark" ? t("common.lightTheme") : t("common.darkTheme")}
                </button>
                <select
                  value={i18n.language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "ru")}
                  className="input !w-auto"
                  aria-label="Language"
                >
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                </select>
              </div>
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${user.id}`}
                    className="btn-ghost flex-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {user.name[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{user.name}</span>
                  </Link>
                  <button
                    className="btn-ghost"
                    onClick={() => void logout().then(() => {
                      setMenuOpen(false);
                      navigate("/");
                    })}
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-primary justify-center" onClick={() => setMenuOpen(false)}>
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        {t("app.name")} — {t("app.tagline")}
      </footer>
    </div>
  );
}
