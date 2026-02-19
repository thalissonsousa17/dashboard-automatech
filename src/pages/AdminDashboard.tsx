import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import {
  Users,
  BookOpen,
  FileText,
  Shield,
  FolderOpen,
  DollarSign,
  TrendingUp,
  UserCheck,
  Mail,
  Calendar,
} from "lucide-react";

interface Professor {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string | null;
  is_public: boolean | null;
  created_at: string;
  slug: string | null;
}

interface SystemStats {
  totalProfessors: number;
  totalPosts: number;
  totalSubmissions: number;
  totalFolders: number;
}

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalProfessors: 0,
    totalPosts: 0,
    totalSubmissions: 0,
    totalFolders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Buscar todos os professores
      const { data: profilesData, count: profilesCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("role", "professor");

      // Buscar total de posts
      const { count: postsCount } = await supabase
        .from("teaching_posts")
        .select("*", { count: "exact", head: true });

      // Buscar total de submissões
      const { count: submissionsCount } = await supabase
        .from("student_submissions")
        .select("*", { count: "exact", head: true });

      // Buscar total de pastas
      const { count: foldersCount } = await supabase
        .from("submission_folders")
        .select("*", { count: "exact", head: true });

      setProfessors((profilesData as Professor[]) || []);
      setStats({
        totalProfessors: profilesCount || 0,
        totalPosts: postsCount || 0,
        totalSubmissions: submissionsCount || 0,
        totalFolders: foldersCount || 0,
      });
    } catch (err) {
      console.error("Erro ao carregar dados admin:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Acesso Restrito
        </h3>
        <p className="text-gray-500">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl h-32 border border-gray-200"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="w-7 h-7 text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Painel do Administrador
          </h1>
        </div>
        <p className="text-gray-600">
          Visão geral do sistema e gerenciamento de usuários
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalProfessors}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Professores Cadastrados
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalPosts}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Publicações no Espaço Docente
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalSubmissions}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Trabalhos Enviados
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {stats.totalFolders}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            Pastas de Submissão
          </h3>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Professors List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
              Professores Registrados
            </h2>
            <span className="text-sm text-gray-500">
              {professors.length} total
            </span>
          </div>

          {professors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Nenhum professor cadastrado ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {professors.map((professor) => (
                <div
                  key={professor.id}
                  className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {professor.display_name?.charAt(0).toUpperCase() || "P"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {professor.display_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {professor.slug
                        ? `/professor/${professor.slug}`
                        : "Sem perfil público"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        professor.is_public
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {professor.is_public ? "Público" : "Privado"}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(professor.created_at).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue / Billing Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Receitas e Faturamento
            </h2>
          </div>

          <div className="space-y-6">
            {/* Revenue Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">
                    Receita Mensal
                  </span>
                </div>
                <p className="text-xl font-bold text-green-900">R$ 0,00</p>
                <p className="text-xs text-green-600 mt-1">Este mês</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">
                    Receita Total
                  </span>
                </div>
                <p className="text-xl font-bold text-blue-900">R$ 0,00</p>
                <p className="text-xs text-blue-600 mt-1">Acumulado</p>
              </div>
            </div>

            {/* Placeholder for future billing features */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                Módulo de Faturamento
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Em breve: controle de assinaturas, faturas e relatórios
                financeiros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-amber-600" />
          Informações do Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Administrador
            </h3>
            <div className="flex items-center text-sm text-gray-900">
              <Mail className="w-4 h-4 mr-2 text-gray-400" />
              {user?.email}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Plataforma
            </h3>
            <p className="text-sm text-gray-900">Automatech Dashboard v1.0</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Último Acesso
            </h3>
            <div className="flex items-center text-sm text-gray-900">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              {new Date().toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
