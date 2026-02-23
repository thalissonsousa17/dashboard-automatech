-- ─── Políticas Admin para Suporte ───────────────────────────────────────────
-- Execute após supabase_support_setup.sql

-- Admin: ler todos os tickets
CREATE POLICY "Admins read all tickets"
    ON public.support_tickets FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin: atualizar status de qualquer ticket
CREATE POLICY "Admins update tickets"
    ON public.support_tickets FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin: ler todas as mensagens
CREATE POLICY "Admins read all messages"
    ON public.ticket_messages FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin: inserir mensagens em qualquer ticket (respostas de suporte)
CREATE POLICY "Admins insert messages"
    ON public.ticket_messages FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admin: inserir notificações para qualquer usuário (aviso de resposta)
CREATE POLICY "Admins insert notifications"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
