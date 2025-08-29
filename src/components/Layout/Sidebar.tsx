// src/components/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Globe,
  Plus,
  LogOut,
  X,
  QrCodeIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { signOut } = useAuth();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      to: "/dashboard/publicar-post",
      icon: Plus,
      label: "Publicar no Espaço Docente",
    },
    { to: "/dashboard/espaco-docente", icon: Globe, label: "Espaço Docente" },
    {
      to: "/dashboard/qr-chamada",
      icon: QrCodeIcon,
      label: "QR Chamada",
      url: "https://qrchamada.automatech.app.br/login",
    },
  ];

  return (
    <>
      {/* Overlay transparente para dispositivos móveis */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-300 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}
      >
        {/* Header do Sidebar */}
        <div className="flex items-center justify-between  border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img
              className="rounded-full w-20 h-20 p-5 z-40"
              src="/assets/automatech-logo.png"
              alt="Logo"
            ></img>
            <span className="font-bold text-gray-900">Automatech</span>
          </div>
          {/* Botão de fechar para dispositivos móveis */}
          <button
            onClick={onToggle}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) =>
            item.url ? (
              // Link externo
              <a
                key={item.to}
                href={item.url}
                target="_self"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            ) : (
              // Link interno
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => window.innerWidth < 1024 && onToggle()}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* Rodapé do Sidebar */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
