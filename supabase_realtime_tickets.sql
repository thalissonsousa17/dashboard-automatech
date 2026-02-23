-- ============================================================
-- Habilita Realtime para notificações e tickets em tempo real
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Habilitar Realtime nas tabelas necessárias ───────────
-- (Supabase Realtime requer que as tabelas estejam na publicação)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- ── 2. RLS: admin pode inserir notificações para qualquer usuário ──
-- (Necessário para sendSupportMessage criar notif para o professor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'admin_insert_notifications'
  ) THEN
    CREATE POLICY "admin_insert_notifications" ON public.notifications
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 3. RLS: usuário pode ler suas próprias notificações ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'own_notifications_select'
  ) THEN
    CREATE POLICY "own_notifications_select" ON public.notifications
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. RLS: usuário pode marcar suas notificações como lidas ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'own_notifications_update'
  ) THEN
    CREATE POLICY "own_notifications_update" ON public.notifications
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. Verificação ──────────────────────────────────────────
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('notifications', 'ticket_messages', 'support_tickets');
