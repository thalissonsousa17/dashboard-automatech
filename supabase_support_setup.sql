-- ─── Suporte: Tickets + Mensagens + Notificações ────────────────────────────
-- Execute este arquivo no SQL Editor do Supabase

-- 1. Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject     text        NOT NULL,
    category    text        NOT NULL DEFAULT 'Técnico',
    status      text        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'waiting', 'resolved')),
    created_at  timestamptz DEFAULT now() NOT NULL,
    updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tickets"
    ON public.support_tickets FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Tabela de mensagens de tickets
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   uuid        REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    from_role   text        NOT NULL DEFAULT 'user'
                            CHECK (from_role IN ('user', 'support')),
    text        text        NOT NULL,
    created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Usuário pode gerenciar mensagens dos seus próprios tickets
CREATE POLICY "Users manage own ticket messages"
    ON public.ticket_messages FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_messages.ticket_id
              AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_messages.ticket_id
              AND user_id = auth.uid()
        )
    );

-- 3. Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type        text        NOT NULL DEFAULT 'system'
                            CHECK (type IN ('ticket', 'system')),
    title       text        NOT NULL,
    body        text        NOT NULL,
    read        boolean     NOT NULL DEFAULT false,
    ticket_id   uuid        REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
    ON public.notifications FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id   ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read        ON public.notifications(user_id, read);
