import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";

export interface TicketMessage {
  id: string;
  from: "user" | "support";
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: "open" | "waiting" | "resolved";
  messages: TicketMessage[];
  createdAt: string;
}

interface TicketContextValue {
  tickets: Ticket[];
  loading: boolean;
  createTicket: (subject: string, description: string, category: string) => Promise<Ticket | null>;
  addMessage: (ticketId: string, text: string) => Promise<void>;
  refreshTickets: () => Promise<void>;
}

const TicketContext = createContext<TicketContextValue | null>(null);

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}
function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
function nowDateTime() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const db = supabase as any;

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await db
        .from("support_tickets")
        .select(`
          id, subject, category, status, created_at,
          ticket_messages(id, from_role, text, created_at)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setTickets(
          data.map((t: any) => ({
            id: t.id,
            subject: t.subject,
            category: t.category,
            status: t.status,
            createdAt: fmtDate(t.created_at),
            messages: (t.ticket_messages ?? [])
              .sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
              .map((m: any) => ({
                id: m.id,
                from: m.from_role as "user" | "support",
                text: m.text,
                createdAt: fmtDateTime(m.created_at),
              })),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(
    async (subject: string, description: string, category: string): Promise<Ticket | null> => {
      if (!user?.id) return null;

      // 1. Insert ticket
      const { data: ticketData, error: ticketErr } = await db
        .from("support_tickets")
        .insert({ user_id: user.id, subject, category, status: "open" })
        .select()
        .single();

      if (ticketErr || !ticketData) return null;

      // 2. Insert user's first message
      await db.from("ticket_messages").insert({
        ticket_id: ticketData.id,
        from_role: "user",
        text: description,
      });

      const firstMsg: TicketMessage = {
        id: `m_${Date.now()}`,
        from: "user",
        text: description,
        createdAt: nowDateTime(),
      };

      const newTicket: Ticket = {
        id: ticketData.id,
        subject,
        category,
        status: "open",
        createdAt: fmtDate(ticketData.created_at),
        messages: [firstMsg],
      };

      setTickets((prev) => [newTicket, ...prev]);

      // 3. Auto-reply from support after 2s
      setTimeout(async () => {
        const autoText =
          "Olá! Recebemos sua solicitação e nossa equipe irá analisá-la em breve. Fique atento às atualizações aqui.";

        await db.from("ticket_messages").insert({
          ticket_id: ticketData.id,
          from_role: "support",
          text: autoText,
        });

        await db
          .from("support_tickets")
          .update({ status: "waiting", updated_at: new Date().toISOString() })
          .eq("id", ticketData.id);

        const autoMsg: TicketMessage = {
          id: `m_auto_${Date.now()}`,
          from: "support",
          text: autoText,
          createdAt: nowDateTime(),
        };

        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketData.id
              ? { ...t, status: "waiting", messages: [...t.messages, autoMsg] }
              : t
          )
        );

        await addNotification({
          type: "ticket",
          title: `Ticket aberto: ${subject.slice(0, 40)}`,
          body: "Recebemos sua solicitação e retornaremos em breve.",
          ticketId: ticketData.id,
          createdAt: "agora",
        });
      }, 2000);

      return newTicket;
    },
    [user?.id, db, addNotification]
  );

  const addMessage = useCallback(
    async (ticketId: string, text: string) => {
      const { data: msgData } = await db
        .from("ticket_messages")
        .insert({ ticket_id: ticketId, from_role: "user", text })
        .select()
        .single();

      const newMsg: TicketMessage = {
        id: msgData?.id ?? `m_${Date.now()}`,
        from: "user",
        text,
        createdAt: nowDateTime(),
      };

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, messages: [...t.messages, newMsg] } : t
        )
      );
    },
    [db]
  );

  return (
    <TicketContext.Provider value={{ tickets, loading, createTicket, addMessage, refreshTickets: fetchTickets }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = (): TicketContextValue => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used within TicketProvider");
  return ctx;
};
