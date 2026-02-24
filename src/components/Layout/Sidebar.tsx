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
  BookOpen,
  Shield,
  FileText,
  Brain,
  FolderOpen,
  FileEdit,
  User,
  LifeBuoy,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import SubscriptionBadge from "../SubscriptionBadge";
import { useFeatureGate } from "../../hooks/useFeatureGate";
import type { AllFeatureKey } from "../../types/subscription";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  url?: string;
  gatedFeature?: AllFeatureKey;
  gatedLabel?: string;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { signOut, isAdmin, user, profile } = useAuth();
  const { checkGate } = useFeatureGate();

  const sections: NavSection[] = [
    {
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      ],
    },
    {
      label: "CONTEÚDO",
      items: [
        { to: "/dashboard/publicar-post", icon: Plus, label: "Publicar Material" },
        { to: "/dashboard/espaco-docente", icon: Globe, label: "Espaço Docente" },
        { to: "/dashboard/student-submissions", icon: FileText, label: "Trabalhos dos Alunos" },
      ],
    },
    {
      label: "FERRAMENTAS",
      items: [
        { to: "/dashboard/gerador-provas", icon: Brain, label: "Gerador de Provas IA" },
        { to: "/dashboard/workspaces", icon: FolderOpen, label: "Minhas Provas" },
        { to: "/dashboard/documents", icon: FileEdit, label: "Editor de Documentos" },
        {
          to: "/dashboard/qr-chamada",
          icon: QrCodeIcon,
          label: "QR Chamada",
          url: "https://qrchamada.automatech.app.br/login",
          gatedFeature: "qr_chamada",
          gatedLabel: "QR Chamada",
        },
      ],
    },
    {
      label: "CONTA",
      items: [
        { to: "/dashboard/ajuda",        icon: HelpCircle, label: "Ajuda" },
        { to: "/dashboard/suporte",       icon: LifeBuoy,   label: "Suporte" },
        { to: "/dashboard/subscription",  icon: CreditCard, label: "Plano & Assinatura" },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "ADMIN",
            items: [
              { to: "/dashboard/admin", icon: Shield, label: "Painel Admin" },
            ],
          },
        ]
      : []),
  ];

  const displayName =
    profile?.display_name || user?.email?.split("@")[0] || "Professor";
  const role = isAdmin ? "Administrador" : "Professor";
  const initial = displayName.charAt(0).toUpperCase();

  const closeOnMobile = () => {
    if (window.innerWidth < 1024) onToggle();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:relative lg:z-20
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-blue-700 to-green-700 bg-clip-text text-transparent">
              AUTOMATECH
            </span>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-5" : ""}>
              {section.label && (
                <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  if (item.url) {
                    const handleExternalClick = (e: React.MouseEvent) => {
                      if (item.gatedFeature) {
                        const ok = checkGate(item.gatedFeature, undefined, item.gatedLabel);
                        if (!ok) { e.preventDefault(); return; }
                      }
                      closeOnMobile();
                    };
                    return (
                      <a
                        key={item.to}
                        href={item.url}
                        target="_self"
                        rel="noopener noreferrer"
                        onClick={handleExternalClick}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/dashboard"}
                      onClick={closeOnMobile}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive ? "text-blue-600" : ""
                            }`}
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile + logout footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-3">
          {/* User info */}
          <NavLink
            to="/dashboard/meu-perfil"
            onClick={closeOnMobile}
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group mb-1"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <SubscriptionBadge clickable={false} />
              </div>
            </div>
            <User className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </NavLink>

          {/* Logout */}
          <button
            onClick={signOut}
            className="flex items-center space-x-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
