import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  slug: string | null;
  avatar_url: string | null;
  is_public: boolean | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<unknown>;
  signUp: (email: string, password: string, role?: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Controle de sessão de uso
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  /** Abre uma nova sessão no banco para o usuário. */
  const openSession = async (userId: string) => {
    try {
      const now = new Date();
      const { data, error } = await db
        .from("user_sessions")
        .insert({ user_id: userId, login_at: now.toISOString() })
        .select("id")
        .single();

      if (!error && data?.id) {
        sessionIdRef.current = data.id;
        sessionStartRef.current = now;
      }
    } catch (err) {
      console.warn("Erro ao abrir sessão:", err);
    }
  };

  /** Fecha a sessão atual calculando a duração. */
  const closeSession = async () => {
    if (!sessionIdRef.current || !sessionStartRef.current) return;
    try {
      const now = new Date();
      const duration_seconds = Math.floor(
        (now.getTime() - sessionStartRef.current.getTime()) / 1000,
      );
      await db
        .from("user_sessions")
        .update({ logout_at: now.toISOString(), duration_seconds })
        .eq("id", sessionIdRef.current);
    } catch (err) {
      console.warn("Erro ao fechar sessão:", err);
    } finally {
      sessionIdRef.current = null;
      sessionStartRef.current = null;
    }
  };

  /** Heartbeat — atualiza logout_at e duration_seconds a cada 5 min. */
  const heartbeat = async () => {
    if (!sessionIdRef.current || !sessionStartRef.current) return;
    try {
      const now = new Date();
      const duration_seconds = Math.floor(
        (now.getTime() - sessionStartRef.current.getTime()) / 1000,
      );
      await db
        .from("user_sessions")
        .update({ logout_at: now.toISOString(), duration_seconds })
        .eq("id", sessionIdRef.current);
    } catch {
      // silencioso — não interrompe o fluxo
    }
  };

  useEffect(() => {
    // Sessão inicial
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          loadProfile(currentUser.id);
          openSession(currentUser.id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Escuta mudanças de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === "SIGNED_IN" && currentUser) {
        loadProfile(currentUser.id);
        // Só abre nova sessão se não há uma já aberta (evita duplicata com getSession acima)
        if (!sessionIdRef.current) {
          openSession(currentUser.id);
        }
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        closeSession();
      } else if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat a cada 5 minutos enquanto logado
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (
    email: string,
    password: string,
    role: string = "professor",
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          display_name: email.split("@")[0],
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    await closeSession(); // fecha sessão antes do logout
    await supabase.auth.signOut();
    setProfile(null);
    navigate("/");
  };

  const isAdmin = profile?.role === "admin";

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
