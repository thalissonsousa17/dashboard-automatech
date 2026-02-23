-- ============================================================
-- SETUP COMPLETO — Painel Admin: Usuários / Logs / Assinaturas
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- Combina supabase_logs_setup.sql + supabase_logs_update_v2.sql
-- ============================================================

-- ── 1. Tabelas de logs ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at         timestamptz  NOT NULL DEFAULT now(),
  logout_at        timestamptz,
  duration_seconds integer,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id  ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON public.user_sessions(login_at);

CREATE TABLE IF NOT EXISTS public.ai_token_usage (
  id                  uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model               text          NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_tokens       integer       NOT NULL DEFAULT 0,
  completion_tokens   integer       NOT NULL DEFAULT 0,
  total_tokens        integer       NOT NULL DEFAULT 0,
  estimated_cost_usd  numeric(14,8) NOT NULL DEFAULT 0,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_id    ON public.ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON public.ai_token_usage(created_at);

-- ── 2. RLS ────────────────────────────────────────────────────

ALTER TABLE public.user_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_sessions' AND policyname = 'user_sessions_self'
  ) THEN
    CREATE POLICY "user_sessions_self" ON public.user_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_token_usage' AND policyname = 'ai_token_usage_self'
  ) THEN
    CREATE POLICY "ai_token_usage_self" ON public.ai_token_usage
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. Função get_admin_user_logs (versão completa com assinaturas) ───────────

-- DROP necessário pois o tipo de retorno pode ter mudado
DROP FUNCTION IF EXISTS public.get_admin_user_logs(timestamptz, timestamptz);

CREATE FUNCTION public.get_admin_user_logs(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  user_id               uuid,
  email                 text,
  phone                 text,
  display_name          text,
  last_login            timestamptz,
  total_session_seconds bigint,
  prompt_tokens         bigint,
  completion_tokens     bigint,
  total_tokens          bigint,
  estimated_cost_usd    numeric,
  plan_name             text,
  plan_slug             text,
  plan_price_brl        numeric,
  subscription_status   text,
  subscription_since    timestamptz,
  subscription_end      timestamptz,
  cancel_at_period_end  boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    au.email,
    au.phone,
    p.display_name,
    MAX(us.login_at)                         AS last_login,
    COALESCE(SUM(us.duration_seconds), 0)    AS total_session_seconds,
    COALESCE(SUM(atu.prompt_tokens),    0)   AS prompt_tokens,
    COALESCE(SUM(atu.completion_tokens),0)   AS completion_tokens,
    COALESCE(SUM(atu.total_tokens),     0)   AS total_tokens,
    COALESCE(SUM(atu.estimated_cost_usd),0)::numeric AS estimated_cost_usd,
    sub.plan_name,
    sub.plan_slug,
    sub.plan_price_brl,
    sub.subscription_status,
    sub.subscription_since,
    sub.subscription_end,
    COALESCE(sub.cancel_at_period_end, false) AS cancel_at_period_end
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  -- assinatura mais recente/ativa do usuário
  LEFT JOIN LATERAL (
    SELECT
      pl.name                AS plan_name,
      pl.slug                AS plan_slug,
      pl.price_brl           AS plan_price_brl,
      s.status               AS subscription_status,
      s.current_period_start AS subscription_since,
      s.current_period_end   AS subscription_end,
      s.cancel_at_period_end
    FROM public.subscriptions s
    JOIN public.plans pl ON pl.id = s.plan_id
    WHERE s.user_id = p.user_id
    ORDER BY
      CASE s.status
        WHEN 'active'   THEN 0
        WHEN 'past_due' THEN 1
        WHEN 'trialing' THEN 2
        ELSE 3
      END,
      pl.price_brl DESC,
      s.updated_at DESC NULLS LAST
    LIMIT 1
  ) sub ON true
  LEFT JOIN public.user_sessions us
         ON us.user_id = p.user_id
        AND (p_from_date IS NULL OR us.login_at  >= p_from_date)
        AND (p_to_date   IS NULL OR us.login_at  <= p_to_date)
  LEFT JOIN public.ai_token_usage atu
         ON atu.user_id = p.user_id
        AND (p_from_date IS NULL OR atu.created_at >= p_from_date)
        AND (p_to_date   IS NULL OR atu.created_at <= p_to_date)
  WHERE p.role IN ('professor', 'teacher')
     OR (p.role IS NULL AND p.user_id != (
          SELECT user_id FROM public.profiles
          WHERE role = 'admin' LIMIT 1
        ))
  GROUP BY
    p.user_id, au.email, au.phone, p.display_name,
    sub.plan_name, sub.plan_slug, sub.plan_price_brl,
    sub.subscription_status, sub.subscription_since,
    sub.subscription_end, sub.cancel_at_period_end
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_logs(timestamptz, timestamptz) TO authenticated;

-- ── 4. Função get_admin_token_summary ─────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_token_summary()
RETURNS TABLE (
  total_prompt_tokens      bigint,
  total_completion_tokens  bigint,
  total_tokens             bigint,
  total_cost_usd           numeric,
  total_users              bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(prompt_tokens),    0)::bigint   AS total_prompt_tokens,
    COALESCE(SUM(completion_tokens),0)::bigint   AS total_completion_tokens,
    COALESCE(SUM(total_tokens),     0)::bigint   AS total_tokens,
    COALESCE(SUM(estimated_cost_usd),0)::numeric AS total_cost_usd,
    COUNT(DISTINCT user_id)::bigint              AS total_users
  FROM public.ai_token_usage
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_token_summary() TO authenticated;
