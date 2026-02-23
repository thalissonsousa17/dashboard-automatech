import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface AppNotification {
  id: string;
  type: "ticket" | "system";
  title: string;
  body: string;
  read: boolean;
  ticketId?: string;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<AppNotification, "id" | "read">) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const db = supabase as any;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      setNotifications(
        data.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.read,
          ticketId: n.ticket_id ?? undefined,
          createdAt: formatRelativeTime(n.created_at),
        }))
      );
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: atualiza o sino instantaneamente quando nova notificação chegar
  useEffect(() => {
    if (!user?.id) return;

    const channel = db
      .channel(`notifications_user_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const n = payload.new;
          setNotifications((prev) => {
            // Evita duplicatas
            if (prev.some((x) => x.id === n.id)) return prev;
            return [
              {
                id: n.id,
                type: n.type as "ticket" | "system",
                title: n.title,
                body: n.body,
                read: false,
                ticketId: n.ticket_id ?? undefined,
                createdAt: "agora",
              },
              ...prev,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await db.from("notifications").update({ read: true }).eq("id", id);
    },
    [db]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await db.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }, [user?.id, db]);

  const addNotification = useCallback(
    async (n: Omit<AppNotification, "id" | "read">) => {
      if (!user?.id) return;
      const { data } = await db
        .from("notifications")
        .insert({
          user_id: user.id,
          type: n.type,
          title: n.title,
          body: n.body,
          ticket_id: n.ticketId ?? null,
          read: false,
        })
        .select()
        .single();

      if (data) {
        setNotifications((prev) => [
          {
            id: data.id,
            type: data.type,
            title: data.title,
            body: data.body,
            read: false,
            ticketId: data.ticket_id ?? undefined,
            createdAt: "agora",
          },
          ...prev,
        ]);
      }
    },
    [user?.id, db]
  );

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
