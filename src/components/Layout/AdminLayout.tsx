import React, { useState } from "react";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  LifeBuoy,
  Activity,
  LogOut,
  GraduationCap,
  Menu,
  X,
  ChevronLeft,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import AdminDashboard from "../../pages/AdminDashboard";
import AdminUserLogs from "../../pages/AdminUserLogs";
import AdminSuporteTickets from "../../pages/AdminSuporteTickets";
import AdminAjuda from "../../pages/AdminAjuda";

const NAV_ITEMS = [
  { to: "/dashboard/admin",         label: "Dashboard",          Icon: LayoutDashboard, end: true },
  { to: "/dashboard/admin/logs",    label: "Usuários",           Icon: Activity },
  { to: "/dashboard/admin/tickets", label: "Suporte",            Icon: LifeBuoy },
  { to: "/dashboard/admin/ajuda",   label: "Ajuda",              Icon: HelpCircle },
];

const AdminLayout: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName =
    profile?.display_name || user?.email?.split("@")[0] || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  const closeMobile = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const Sidebar = (
    <div className="w-64 bg-slate-900 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Admin Painel</p>
            <p className="text-white/40 text-xs mt-0.5">Gerenciamento do Sistema</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
            Área do Professor
          </p>
          <NavLink
            to="/dashboard"
            onClick={closeMobile}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            Meu Dashboard
          </NavLink>
          <NavLink
            to="/dashboard"
            end
            className="hidden"
            aria-hidden
          />
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-1">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-white/40 text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-shrink-0">{Sidebar}</div>

      {/* Sidebar mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden flex flex-shrink-0 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {Sidebar}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <span className="text-white font-semibold text-sm">Admin Painel</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/"        element={<AdminDashboard />} />
            <Route path="/logs"    element={<AdminUserLogs />} />
            <Route path="/tickets" element={<AdminSuporteTickets />} />
            <Route path="/ajuda"   element={<AdminAjuda />} />
            <Route path="*"        element={<Navigate to="/dashboard/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
