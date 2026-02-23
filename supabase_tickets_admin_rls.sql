-- ============================================================
-- FIX: RLS de support_tickets e ticket_messages para admin
-- PROBLEMA: admin não consegue ver tickets de outros usuários
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. support_tickets ──────────────────────────────────────

-- Usuário vê apenas seus próprios tickets (já deve existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_tickets' AND policyname = 'tickets_own_select'
  ) THEN
    CREATE POLICY "tickets_own_select" ON public.support_tickets
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Admin vê TODOS os tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_tickets' AND policyname = 'tickets_admin_select'
  ) THEN
    CREATE POLICY "tickets_admin_select" ON public.support_tickets
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin pode atualizar status de qualquer ticket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_tickets' AND policyname = 'tickets_admin_update'
  ) THEN
    CREATE POLICY "tickets_admin_update" ON public.support_tickets
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 2. ticket_messages ──────────────────────────────────────

-- Usuário vê mensagens dos seus próprios tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_messages' AND policyname = 'messages_own_select'
  ) THEN
    CREATE POLICY "messages_own_select" ON public.ticket_messages
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.support_tickets
          WHERE id = ticket_id AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin vê mensagens de TODOS os tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_messages' AND policyname = 'messages_admin_select'
  ) THEN
    CREATE POLICY "messages_admin_select" ON public.ticket_messages
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Admin pode inserir mensagens em qualquer ticket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticket_messages' AND policyname = 'messages_admin_insert'
  ) THEN
    CREATE POLICY "messages_admin_insert" ON public.ticket_messages
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ── 3. Verificação ──────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('support_tickets', 'ticket_messages')
ORDER BY tablename, policyname;
