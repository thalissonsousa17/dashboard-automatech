import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface AdminTicketMessage {
  id: string;
  from: "user" | "support";
  text: string;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: string;
  status: "open" | "waiting" | "resolved";
  messages: AdminTicketMessage[];
  createdAt: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}
function fmtDT(d: string) {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

const useAdminTickets = () => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const db = supabase as any;

  const fetchAllTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ticketData } = await db
        .from("support_tickets")
        .select(`
          id, user_id, subject, category, status, created_at,
          ticket_messages(id, from_role, text, created_at)
        `)
        .order("created_at", { ascending: false });

      if (!ticketData || ticketData.length === 0) {
        setTickets([]);
        return;
      }

      const userIds = [...new Set<string>(ticketData.map((t: any) => t.user_id))];
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map<string, string>(
        (profiles || []).map((p: any) => [p.user_id as string, (p.display_name || "Usuário") as string])
      );

      setTickets(
        ticketData.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          userName: profileMap.get(t.user_id) ?? "Usuário",
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
              createdAt: fmtDT(m.created_at),
            })),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTickets();
  }, [fetchAllTickets]);

  const sendSupportMessage = useCallback(
    async (ticketId: string, text: string) => {
      // 1. Insere mensagem do suporte
      await db.from("ticket_messages").insert({
        ticket_id: ticketId,
        from_role: "support",
        text,
      });

      // 2. Marca ticket como "open" (aguardando resposta do usuário)
      await db
        .from("support_tickets")
        .update({ status: "open", updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      const now = new Date().toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      });

      const newMsg: AdminTicketMessage = {
        id: `m_${Date.now()}`,
        from: "support",
        text,
        createdAt: now,
      };

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: "open", messages: [...t.messages, newMsg] }
            : t
        )
      );

      // 3. Cria notificação para o usuário do ticket (dispara Realtime no browser do professor)
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket?.userId) {
        await db.from("notifications").insert({
          user_id: ticket.userId,
          type: "ticket",
          title: "Suporte respondeu ao seu ticket",
          body: text.length > 100 ? text.slice(0, 97) + "..." : text,
          ticket_id: ticketId,
          read: false,
        });
      }
    },
    [tickets, db]
  );

  const updateStatus = useCallback(
    async (ticketId: string, status: AdminTicket["status"]) => {
      await db
        .from("support_tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
    },
    [db]
  );

  return { tickets, loading, fetchAllTickets, sendSupportMessage, updateStatus };
};

export default useAdminTickets;
