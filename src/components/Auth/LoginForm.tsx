import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserPlus,
  Shield,
  GraduationCap,
  CheckCircle,
  Brain,
  QrCode,
  FileText,
  ArrowLeft,
} from "lucide-react";

const FEATURES = [
  { icon: Brain,     text: "Gere provas completas com IA em minutos" },
  { icon: QrCode,    text: "Chamada automática por QR Code" },
  { icon: FileText,  text: "Materiais organizados por disciplina" },
  { icon: CheckCircle, text: "Relatórios de frequência em tempo real" },
];

const LoginForm: React.FC = () => {
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [isSignUp, setIsSignUp]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [adminCode, setAdminCode]         = useState("");
  const [adminExists, setAdminExists]     = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if (!error) setAdminExists((count ?? 0) > 0);
      } catch {
        setAdminExists(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdminExists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("As senhas não coincidem");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres");
        setLoading(false);
        return;
      }

      let role = "professor";
      if (adminCode.trim() !== "") {
        if (adminCode !== import.meta.env.VITE_ADMIN_CODE) {
          setError("Código de administrador inválido");
          setLoading(false);
          return;
        }
        if (adminExists) {
          setError("Já existe um administrador cadastrado no sistema");
          setLoading(false);
          return;
        }
        role = "admin";
      }

      try {
        const { error } = await signUp(email, password, role);
        if (error) {
          setError(error.message || "Erro ao criar conta");
        } else {
          setError("");
          alert(
            role === "admin"
              ? "Conta de Administrador criada! Verifique seu email e faça login."
              : "Conta criada com sucesso! Verifique seu email e faça login.",
          );
          setIsSignUp(false);
          setAdminCode("");
          if (role === "admin") setAdminExists(true);
        }
      } catch {
        setError("Erro ao criar conta. Tente novamente.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { error } = await signIn(email, password);
        if (error) setError(error.message || "Erro ao fazer login");
      } catch {
        setError("Erro ao fazer login. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAdminCode("");
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — branding ─────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-700 via-blue-600 to-green-500 flex-col justify-between p-12 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-none">Automatech</p>
            <p className="text-white/60 text-xs">Plataforma Educacional</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            A plataforma que os professores <span className="text-green-200">precisavam</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-10">
            Gere provas com IA, faça chamadas por QR Code e organize seus materiais
            — tudo em um só lugar.
          </p>

          <ul className="space-y-4">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/85 text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom note */}
        <p className="relative text-white/40 text-xs">
          © {new Date().getFullYear()} Automatech · suporte@automatech.app.br
        </p>
      </div>

      {/* ── Painel direito — formulário ─────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Automatech</span>
          </div>
          <a href="/" className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </a>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md">
            {/* Top link voltar (desktop) */}
            <a
              href="/"
              className="hidden lg:inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao site
            </a>

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                {isSignUp ? "Criar sua conta" : "Bem-vindo de volta"}
              </h1>
              <p className="text-gray-500 text-sm">
                {isSignUp
                  ? "Preencha os dados abaixo para começar."
                  : "Digite seu email e senha para acessar o painel."}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar senha */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Código admin */}
              {isSignUp && !adminExists && !checkingAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de administrador{" "}
                    <span className="font-normal text-gray-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    <input
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all bg-amber-50"
                      placeholder="Deixe vazio para conta de professor"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Apenas para o administrador do sistema.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-sm hover:shadow-md text-sm mt-2"
              >
                {loading
                  ? isSignUp ? "Criando conta..." : "Entrando..."
                  : isSignUp ? "Criar conta" : "Entrar na plataforma"}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-sm text-gray-500 text-center mt-6">
              {isSignUp ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
              <button
                type="button"
                onClick={resetForm}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                {isSignUp ? (
                  <><Lock className="w-3 h-3 inline mr-1" />Fazer login</>
                ) : (
                  <><UserPlus className="w-3 h-3 inline mr-1" />Criar gratuitamente</>
                )}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
