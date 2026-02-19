import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  slug: string;
  avatar_url?: string;
  is_public: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editForm, setEditForm] = useState({
    display_name: "",
    bio: "",
    slug: "",
    avatar_url: "",
    is_public: false,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      if (!import.meta.env.VITE_SUPABASE_URL || !user) {
        // Mock profile for demo
        const mockProfile: UserProfile = {
          id: "1",
          user_id: user?.id || "mock-user",
          display_name: user?.email?.split("@")[0] || "Usuário",
          bio: "",
          slug: user?.email?.split("@")[0]?.toLowerCase() || "usuario",
          avatar_url: "",
          is_public: false,
          role: user?.user_metadata?.role || "professor",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(mockProfile);
        setEditForm({
          display_name: mockProfile.display_name,
          bio: mockProfile.bio || "",
          slug: mockProfile.slug,
          avatar_url: mockProfile.avatar_url || "",
          is_public: mockProfile.is_public,
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        setEditForm({
          display_name: data.display_name || "",
          bio: data.bio || "",
          slug: data.slug || "",
          avatar_url: data.avatar_url || "",
          is_public: data.is_public || false,
        });
      } else {
        // Create profile if doesn't exist
        const newProfile = {
          user_id: user.id,
          display_name: user.email?.split("@")[0] || "Usuário",
          bio: "",
          is_public: false,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;

        setProfile(createdProfile);
        setEditForm({
          display_name: createdProfile.display_name || "",
          bio: createdProfile.bio || "",
          slug: createdProfile.slug || "",
          avatar_url: createdProfile.avatar_url || "",
          is_public: createdProfile.is_public || false,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setError("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

    try {
      setSaving(true);
      setError("");

      if (!import.meta.env.VITE_SUPABASE_URL) {
        // Mock save for demo
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                display_name: editForm.display_name,
                bio: editForm.bio,
                slug: editForm.slug,
                avatar_url: editForm.avatar_url,
                is_public: editForm.is_public,
                updated_at: new Date().toISOString(),
              }
            : null
        );
        setEditing(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: editForm.display_name,
          bio: editForm.bio,
          slug: editForm.slug,
          avatar_url: editForm.avatar_url,
          is_public: editForm.is_public,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setEditing(false);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        slug: profile.slug || "",
        avatar_url: profile.avatar_url || "",
        is_public: profile.is_public || false,
      });
    }
    setEditing(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="space-y-3 flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Perfil não encontrado
        </h3>
        <p className="text-gray-500">Erro ao carregar informações do perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
        <p className="text-gray-600">
          Gerencie suas informações pessoais e configurações
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Informações Pessoais
          </h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-6 mb-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-green-800 to-blue-700 rounded-full flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            {editing && (
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        display_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Biografia
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug do Perfil
                  </label>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                      automatech.com/professor/
                    </span>
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="seu-nome"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    URL única para seu perfil público. Apenas letras, números e
                    hífens.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL do Avatar
                  </label>
                  <input
                    type="url"
                    value={editForm.avatar_url}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        avatar_url: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://exemplo.com/avatar.jpg"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Perfil Público
                    </h4>
                    <p className="text-sm text-gray-500">
                      Permitir que outros vejam seu perfil e publicações
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_public}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          is_public: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {profile.display_name}
                </h3>
                {profile.bio && (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {user?.email}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    https://edu.automatech.app.br/professor/{profile.slug}
                  </div>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    {profile.role === "admin" ? "Administrador" : "Professor"}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Perfil {profile.is_public ? "Público" : "Privado"}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Membro desde{" "}
                    {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {editing && (
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4 mr-2 inline" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Informações da Conta
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              ID do Usuário
            </h3>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
              {user?.id}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Slug do Perfil
            </h3>
            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {profile.slug}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Última Atualização
            </h3>
            <p className="text-sm text-gray-900">
              {new Date(profile.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Status do Perfil
            </h3>
            <p className="text-sm text-gray-900">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile.is_public
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {profile.is_public ? "🌐 Público" : "🔒 Privado"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
