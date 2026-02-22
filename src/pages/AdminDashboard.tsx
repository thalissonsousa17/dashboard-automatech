import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import StatsCard from "../components/Dashboard/StatsCard";
import {
  Users,
  BookOpen,
  FileText,
  Shield,
  FolderOpen,
  UserCheck,
  Mail,
  Calendar,
  Search,
  Brain,
  Globe,
  Lock,
  RefreshCw,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Professor {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_public: boolean | null;
  created_at: string;
  slug: string | null;
}

interface SystemStats {
  totalProfessors: number;
  totalPosts: number;
  totalSubmissions: number;
  totalExams: number;
}

const AVATAR_COLORS = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
];

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<SystemStats>({
    totalProfessors: 0,
    totalPosts: 0,
    totalSubmissions: 0,
    totalExams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAdmin) loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadAdminData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [profilesRes, postsRes, submissionsRes, examsRes] =
        await Promise.all([
          db.from("profiles").select("*", { count: "exact" }).eq("role", "professor"),
          db.from("teaching_posts").select("id", { count: "exact", head: true }),
          db.from("student_submissions").select("id", { count: "exact", head: true }),
          db.from("exams").select("id", { count: "exact", head: true }),
        ]);

      setProfessors((profilesRes.data as Professor[]) || []);
      setStats({
        totalProfessors: profilesRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        totalExams: examsRes.count || 0,
      });
    } catch (err) {
      console.error("Erro ao carregar dados admin:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredProfessors = professors.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="w-14 h-14 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Acesso Restrito
        </h3>
        <p className="text-gray-500 text-sm">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-64 border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Painel Admin
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Visão geral do sistema e gerenciamento de usuários
          </p>
        </div>
        <button
          onClick={() => loadAdminData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Professores"
          value={stats.totalProfessors}
          icon={Users as React.FC<React.SVGProps<SVGSVGElement>>}
          color="blue"
        />
        <StatsCard
          title="Publicações"
          value={stats.totalPosts}
          icon={BookOpen as React.FC<React.SVGProps<SVGSVGElement>>}
          color="green"
        />
        <StatsCard
          title="Trabalhos Enviados"
          value={stats.totalSubmissions}
          icon={FileText as React.FC<React.SVGProps<SVGSVGElement>>}
          color="purple"
        />
        <StatsCard
          title="Provas Geradas"
          value={stats.totalExams}
          icon={Brain as React.FC<React.SVGProps<SVGSVGElement>>}
          color="orange"
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Professors list */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Professores Registrados
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {stats.totalProfessors}
            </span>
          </div>

          {/* Search */}
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar professor..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-80 px-3 pb-3">
            {filteredProfessors.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">
                  {search ? "Nenhum resultado" : "Nenhum professor cadastrado"}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredProfessors.map((professor, idx) => {
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <div
                      key={professor.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${color} overflow-hidden`}
                      >
                        {professor.avatar_url ? (
                          <img
                            src={professor.avatar_url}
                            alt={professor.display_name || ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold">
                            {professor.display_name?.charAt(0).toUpperCase() || "P"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {professor.display_name || "Sem nome"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {professor.slug
                            ? `/professor/${professor.slug}`
                            : "Sem slug definido"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            professor.is_public
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {professor.is_public ? (
                            <Globe className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {professor.is_public ? "Público" : "Privado"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(professor.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Platform overview */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-600" />
              Resumo da Plataforma
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              {
                label: "Professores com perfil público",
                value: professors.filter((p) => p.is_public).length,
                total: stats.totalProfessors,
                color: "bg-blue-500",
              },
              {
                label: "Média de publicações por professor",
                value:
                  stats.totalProfessors > 0
                    ? (stats.totalPosts / stats.totalProfessors).toFixed(1)
                    : "0",
                total: null,
                color: "bg-green-500",
              },
              {
                label: "Trabalhos enviados",
                value: stats.totalSubmissions,
                total: null,
                color: "bg-purple-500",
              },
              {
                label: "Provas criadas (total)",
                value: stats.totalExams,
                total: null,
                color: "bg-orange-500",
              },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.total !== null
                      ? `${item.value}/${item.total}`
                      : item.value}
                  </span>
                </div>
                {item.total !== null && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{
                        width: `${
                          item.total > 0
                            ? ((Number(item.value) / item.total) * 100).toFixed(0)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" />
          Informações do Sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Administrador
            </p>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              {user?.email}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Versão
            </p>
            <p className="text-gray-700">Automatech Dashboard v2.0</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Acesso atual
            </p>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {new Date().toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
