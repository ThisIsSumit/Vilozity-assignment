import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Bell,
  Users,
  Building2,
  UserCircle,
  LogOut,
  Menu,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../services/api";
import { NotificationBell } from "./NotificationBell";
import { PresenceDot } from "./PresenceDot";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const openSidebar = useUiStore((s) => s.openSidebar);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clear();
      navigate("/login");
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        onMouseEnter={openSidebar}
        onMouseLeave={closeSidebar}
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } overflow-hidden border-r border-slate-200 bg-white transition-all duration-200`}
      >
        <div className="flex h-16 items-center gap-2 px-5 font-semibold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">V</span>{" "}
          Velozity
        </div>
        <nav className="space-y-1 px-3">
          <NavLink to="/dashboard" className={navItemClass}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </NavLink>
          <NavLink to="/projects" className={navItemClass}>
            <FolderKanban className="h-4 w-4" /> Projects
          </NavLink>
          <NavLink to="/tasks" className={navItemClass}>
            <ListChecks className="h-4 w-4" /> Tasks
          </NavLink>
          <NavLink to="/notifications" className={navItemClass}>
            <Bell className="h-4 w-4" /> Notifications
          </NavLink>
          <NavLink to="/clients" className={navItemClass}>
            <Building2 className="h-4 w-4" /> Clients
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/users" className={navItemClass}>
              <Users className="h-4 w-4" /> Users
            </NavLink>
          )}
          <NavLink to="/profile" className={navItemClass}>
            <UserCircle className="h-4 w-4" /> Profile
          </NavLink>
        </nav>
      </aside>
      {!sidebarOpen && (
        <div
          aria-label="Open navigation menu"
          className="fixed inset-y-16 left-0 z-10 w-3"
          onMouseEnter={openSidebar}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button onClick={toggleSidebar} className="rounded-md p-2 hover:bg-slate-100">
            <Menu className="h-5 w-5 text-slate-500" />
          </button>
          <div className="flex items-center gap-4">
            {user?.role === "ADMIN" && <PresenceDot />}
            <NotificationBell />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {user?.name?.charAt(0) ?? "?"}
              </div>
              <div className="hidden text-sm sm:block">
                <p className="font-medium leading-tight text-slate-700">{user?.name}</p>
                <p className="text-xs leading-tight text-slate-400">{user?.role.replace("_", " ")}</p>
              </div>
              <button onClick={handleLogout} className="ml-2 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
