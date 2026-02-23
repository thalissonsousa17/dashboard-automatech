-- ============================================================
-- Tabela: help_items
-- Itens de ajuda: documentação (links) e vídeos (YouTube)
-- Gerenciado pelo admin; lido por todos os usuários autenticados
-- ============================================================

CREATE TABLE IF NOT EXISTS public.help_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('doc', 'video')),
  title       TEXT NOT NULL,
  url         TEXT,           -- para type='doc': URL da documentação
  video_id    TEXT,           -- para type='video': ID do vídeo YouTube
  sort_order  INT  NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para ordenação eficiente
CREATE INDEX IF NOT EXISTS idx_help_items_type_sort ON public.help_items (type, sort_order);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_help_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_items_updated_at ON public.help_items;
CREATE TRIGGER trg_help_items_updated_at
  BEFORE UPDATE ON public.help_items
  FOR EACH ROW EXECUTE FUNCTION public.update_help_items_updated_at();

-- ── Row Level Security ───────────────────────────────────────────

ALTER TABLE public.help_items ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler itens ativos
CREATE POLICY "help_items_read" ON public.help_items
  FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem inserir
CREATE POLICY "help_items_admin_insert" ON public.help_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem atualizar
CREATE POLICY "help_items_admin_update" ON public.help_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admins podem deletar
CREATE POLICY "help_items_admin_delete" ON public.help_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Dados iniciais de exemplo ────────────────────────────────────

INSERT INTO public.help_items (type, title, url, sort_order) VALUES
  ('doc', 'Como usar o Gerador de Provas IA', '#', 0),
  ('doc', 'Como configurar o QR Chamada',     '#', 1),
  ('doc', 'Gerenciar Assinatura & Planos',     '#', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.help_items (type, title, video_id, sort_order) VALUES
  ('video', 'Gerando sua primeira prova com IA',   'dQw4w9WgXcQ', 0),
  ('video', 'Como usar o Editor de Documentos',    'dQw4w9WgXcQ', 1)
ON CONFLICT DO NOTHING;
