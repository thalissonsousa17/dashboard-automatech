import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Lock, Mail, Eye, EyeOff, UserPlus, Shield } from "lucide-react";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminExists, setAdminExists] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const { signIn, signUp } = useAuth();

  // Verificar se já existe um admin cadastrado
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");

        if (!error) {
          setAdminExists((count ?? 0) > 0);
        }
      } catch (err) {
        console.error("Erro ao verificar admin:", err);
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
      // Validação de senhas
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

      // Determinar role baseado no código admin
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
              ? "Conta de Administrador criada com sucesso! Verifique seu email e faça login."
              : "Conta criada com sucesso! Verifique seu email e faça login."
          );
          setIsSignUp(false);
          setAdminCode("");
          if (role === "admin") {
            setAdminExists(true);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao criar conta. Tente novamente.");
      } finally {
        setLoading(false);
      }
    } else {
      // Login
      try {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || "Erro ao fazer login");
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao fazer login. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Automatech</h1>
                <p className="text-xs text-gray-500">Plataforma Educacional</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-600 to-blue-700 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSignUp ? "Criar Conta" : "Automatech"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSignUp
                ? "Crie sua conta para acessar o painel"
                : "Faça login para acessar o painel"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Campo de Código Admin - só aparece se não existe admin ainda */}
            {isSignUp && !adminExists && !checkingAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Administrador (opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-amber-500" />
                  </div>
                  <input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-amber-50"
                    placeholder="Deixe vazio para conta de professor"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Apenas insira o código se você é o administrador do sistema.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? isSignUp
                  ? "Criando conta..."
                  : "Entrando..."
                : isSignUp
                ? "Criar Conta"
                : "Entrar"}
            </button>
          </form>

          {/* Toggle between Login/SignUp */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setAdminCode("");
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center mx-auto"
            >
              {isSignUp ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Já tem conta? Faça login
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Não tem conta? Crie uma
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
