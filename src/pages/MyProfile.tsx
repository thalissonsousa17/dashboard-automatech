import React, { useState, useEffect, useRef } from "react";
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
  Globe,
  Lock,
  Link2,
  Copy,
  Check,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

const BIO_LIMIT = 300;

/** Gera slug a partir do nome: remove acentos, lowercase, hifeniza */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const MyProfile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // Avatar preview local (antes de salvar)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [editForm, setEditForm] = useState({
    display_name: "",
    bio: "",
    slug: "",
    avatar_url: "",
    is_public: false,
  });

  // Slug foi editado manualmente (não auto-gerar mais)
  const slugManualRef = useRef(false);

  // ── Troca de senha ────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      if (!import.meta.env.VITE_SUPABASE_URL || !user) {
        const mock: UserProfile = {
          id: "1",
          user_id: user?.id || "mock",
          display_name: user?.email?.split("@")[0] || "Professor",
          bio: "",
          slug: user?.email?.split("@")[0]?.toLowerCase() || "professor",
          avatar_url: "",
          is_public: false,
          role: "professor",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(mock);
        populateForm(mock);
        return;
      }

      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile(data);
        populateForm(data);
      } else {
        // Cria perfil se não existir
        const newProfile = {
          user_id: user.id,
          display_name: user.email?.split("@")[0] || "Professor",
          bio: "",
          is_public: false,
        };
        const { data: created, error: createErr } = await db
          .from("profiles")
          .insert([newProfile])
          .select()
          .single();
        if (createErr) throw createErr;
        setProfile(created);
        populateForm(created);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setError("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (p: UserProfile) => {
    setEditForm({
      display_name: p.display_name || "",
      bio: p.bio || "",
      slug: p.slug || "",
      avatar_url: p.avatar_url || "",
      is_public: p.is_public || false,
    });
    slugManualRef.current = false;
  };

  // ── Avatar ────────────────────────────────────────────────────

  const handleAvatarClick = () => {
    if (editing) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/avatar.${ext}`;

    const { error: uploadErr } = await db.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw uploadErr;

    const { data } = db.storage.from("avatars").getPublicUrl(path);
    // Cache-bust para forçar reload do avatar
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  // ── Name → slug auto-generate ────────────────────────────────

  const handleNameChange = (name: string) => {
    setEditForm((prev) => ({
      ...prev,
      display_name: name,
      slug: slugManualRef.current ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (value: string) => {
    slugManualRef.current = true;
    setEditForm((prev) => ({
      ...prev,
      slug: value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    }));
  };

  // ── Save ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!profile || !user) return;
    if (!editForm.display_name.trim()) {
      setError("O nome de exibição é obrigatório.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let avatar_url = editForm.avatar_url;

      // Upload avatar se mudou
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          avatar_url = await uploadAvatar(avatarFile);
        } catch (uploadErr) {
          console.error("Falha no upload do avatar:", uploadErr);
          setError(
            "Não foi possível fazer upload da foto. Verifique se o bucket 'avatars' existe no Supabase Storage.",
          );
          setSaving(false);
          setUploadingAvatar(false);
          return;
        } finally {
          setUploadingAvatar(false);
        }
      }

      const { data, error: saveErr } = await db
        .from("profiles")
        .update({
          display_name: editForm.display_name.trim(),
          bio: editForm.bio.trim(),
          slug: editForm.slug || slugify(editForm.display_name),
          avatar_url,
          is_public: editForm.is_public,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (saveErr) throw saveErr;

      setProfile(data);
      populateForm(data);
      setAvatarFile(null);
      setAvatarPreview(null);
      setEditing(false);
      setSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => setSuccess(""), 4000);

      // Atualiza contexto de auth (sidebar, header)
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) populateForm(profile);
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditing(false);
    setError("");
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess("");

    if (!pwForm.next || !pwForm.confirm) {
      setPwError("Preencha a nova senha e a confirmação.");
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("A nova senha e a confirmação não coincidem.");
      return;
    }

    setPwLoading(true);

    // Verifica senha atual re-autenticando
    if (pwForm.current && user?.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });
      if (signInErr) {
        setPwError("Senha atual incorreta. Verifique e tente novamente.");
        setPwLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: pwForm.next });

    if (error) {
      setPwError(error.message || "Erro ao alterar senha. Tente novamente.");
    } else {
      setPwSuccess("Senha alterada com sucesso!");
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(""), 5000);
    }

    setPwLoading(false);
  };

  const copyUrl = () => {
    const url = `https://edu.automatech.app.br/professor/${profile?.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render helpers ────────────────────────────────────────────

  const currentAvatar = avatarPreview || editForm.avatar_url || profile?.avatar_url;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-2xl">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div className="space-y-3 flex-1">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <User className="w-14 h-14 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Perfil não encontrado
        </h3>
        <p className="text-gray-500 text-sm">
          Erro ao carregar informações do perfil.
        </p>
      </div>
    );
  }

  const publicUrl = `https://edu.automatech.app.br/professor/${profile.slug}`;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gerencie suas informações pessoais e configurações
        </p>
      </div>

      {/* ── Feedback messages ── */}
      {success && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-green-800 text-sm font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* ── Profile Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Informações Pessoais
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          ) : (
            <span className="text-xs text-gray-400">Editando...</span>
          )}
        </div>

        <div className="p-6">
          {/* ── VIEW MODE ── */}
          {!editing ? (
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 mb-0.5">
                  {profile.display_name}
                </h3>
                {profile.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                    {profile.bio}
                  </p>
                )}

                <div className="space-y-1.5 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{user?.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-xs font-mono text-gray-400">
                      {publicUrl}
                    </span>
                    <button
                      onClick={copyUrl}
                      title="Copiar URL"
                      className="p-0.5 hover:text-blue-600 transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {profile.role === "admin" ? "Administrador" : "Professor"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {profile.is_public ? (
                      <Globe className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span>
                      Perfil{" "}
                      <span
                        className={
                          profile.is_public
                            ? "text-green-600 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {profile.is_public ? "público" : "privado"}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Membro desde{" "}
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── EDIT MODE ── */
            <div className="space-y-5">
              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div
                    onClick={handleAvatarClick}
                    className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center cursor-pointer group"
                  >
                    {currentAvatar ? (
                      <img
                        src={currentAvatar}
                        alt="Avatar"
                        className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {editForm.display_name.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md"
                  >
                    {uploadingAvatar ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {avatarFile ? avatarFile.name : "Escolher foto"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG ou WebP • máx. 2 MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome de Exibição <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: Prof. Ana Silva"
                  maxLength={80}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Biografia
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      bio: e.target.value.slice(0, BIO_LIMIT),
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Conte um pouco sobre você, sua área de atuação..."
                />
                <p
                  className={`text-xs mt-1 text-right ${
                    editForm.bio.length >= BIO_LIMIT
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {editForm.bio.length}/{BIO_LIMIT}
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  URL do Perfil Público
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 text-xs border-r border-gray-300 whitespace-nowrap">
                    /professor/
                  </span>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                    placeholder="seu-nome"
                    maxLength={60}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Gerado automaticamente a partir do nome. Apenas letras,
                  números e hífens.
                </p>
              </div>

              {/* Toggle público */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Perfil Público
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permite que outros professores vejam seu perfil e
                    publicações
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editForm.display_name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {uploadingAvatar ? "Enviando foto..." : "Salvando..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Account Info ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Informações da Conta
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              E-mail
            </p>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Função
            </p>
            <p className="text-sm text-gray-900">
              {profile.role === "admin" ? "Administrador" : "Professor"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Última atualização
            </p>
            <p className="text-sm text-gray-900">
              {new Date(profile.updated_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Status
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                profile.is_public
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {profile.is_public ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              {profile.is_public ? "Público" : "Privado"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Alterar Senha</h2>
            <p className="text-xs text-gray-400">Recomendamos usar uma senha forte e única</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {pwSuccess && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-sm font-medium">{pwSuccess}</p>
            </div>
          )}
          {pwError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-800 text-sm">{pwError}</p>
            </div>
          )}

          {/* Senha atual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha atual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showNext ? "text" : "password"}
                value={pwForm.next}
                onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Indicador de força */}
            {pwForm.next.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = pwForm.next.length >= 12 && /[A-Z]/.test(pwForm.next) && /[0-9]/.test(pwForm.next) && /[^a-zA-Z0-9]/.test(pwForm.next) ? 4
                      : pwForm.next.length >= 10 && (/[A-Z]/.test(pwForm.next) || /[0-9]/.test(pwForm.next)) ? 3
                      : pwForm.next.length >= 8 ? 2
                      : 1;
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength
                            ? strength === 1 ? "bg-red-400"
                            : strength === 2 ? "bg-yellow-400"
                            : strength === 3 ? "bg-blue-400"
                            : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-xs text-gray-400">
                  {pwForm.next.length < 6 ? "Muito fraca"
                    : pwForm.next.length < 8 ? "Fraca"
                    : pwForm.next.length < 10 ? "Média"
                    : pwForm.next.length >= 12 && /[A-Z]/.test(pwForm.next) && /[0-9]/.test(pwForm.next) ? "Forte"
                    : "Boa"}
                </span>
              </div>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                className={`w-full pl-3 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none transition-colors ${
                  pwForm.confirm && pwForm.next !== pwForm.confirm
                    ? "border-red-300 focus:ring-red-400 bg-red-50"
                    : pwForm.confirm && pwForm.next === pwForm.confirm
                    ? "border-green-300 focus:ring-green-400 bg-green-50"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {pwForm.confirm && pwForm.next === pwForm.confirm && (
                <Check className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleChangePassword}
              disabled={pwLoading || !pwForm.next || !pwForm.confirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {pwLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Alterar Senha
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
