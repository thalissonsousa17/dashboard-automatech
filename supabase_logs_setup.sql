-- ============================================================
-- LOGS DE USUÁRIOS — Sessões e Uso de Tokens OpenAI
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at        timestamptz  NOT NULL DEFAULT now(),
  logout_at       timestamptz,
  duration_seconds integer,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id  ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON public.user_sessions(login_at);

-- 2. Tabela de uso de tokens OpenAI
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

-- 3. RLS
ALTER TABLE public.user_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_usage  ENABLE ROW LEVEL SECURITY;

-- Usuários gerenciam apenas seus próprios dados
CREATE POLICY "user_sessions_self"    ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_token_usage_self"   ON public.ai_token_usage
  FOR ALL USING (auth.uid() = user_id);

-- 4. Função RPC para o painel admin (SECURITY DEFINER acessa auth.users)
CREATE OR REPLACE FUNCTION public.get_admin_user_logs(
  p_from_date timestamptz DEFAULT NULL,
  p_to_date   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  user_id              uuid,
  email                text,
  phone                text,
  display_name         text,
  last_login           timestamptz,
  total_session_seconds bigint,
  prompt_tokens        bigint,
  completion_tokens    bigint,
  total_tokens         bigint,
  estimated_cost_usd   numeric
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
    MAX(us.login_at)                      AS last_login,
    COALESCE(SUM(us.duration_seconds), 0) AS total_session_seconds,
    COALESCE(SUM(atu.prompt_tokens),    0) AS prompt_tokens,
    COALESCE(SUM(atu.completion_tokens),0) AS completion_tokens,
    COALESCE(SUM(atu.total_tokens),     0) AS total_tokens,
    COALESCE(SUM(atu.estimated_cost_usd),0)::numeric AS estimated_cost_usd
  FROM public.profiles p
  LEFT JOIN auth.users au
         ON au.id = p.user_id
  LEFT JOIN public.user_sessions us
         ON us.user_id = p.user_id
        AND (p_from_date IS NULL OR us.login_at  >= p_from_date)
        AND (p_to_date   IS NULL OR us.login_at  <= p_to_date)
  LEFT JOIN public.ai_token_usage atu
         ON atu.user_id = p.user_id
        AND (p_from_date IS NULL OR atu.created_at >= p_from_date)
        AND (p_to_date   IS NULL OR atu.created_at <= p_to_date)
  WHERE p.role = 'professor'
  GROUP BY p.user_id, au.email, au.phone, p.display_name
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_logs(timestamptz, timestamptz) TO authenticated;

-- 5. Resumo global para o admin (totais sem filtro de usuário)
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
    COALESCE(SUM(prompt_tokens),0)::bigint       AS total_prompt_tokens,
    COALESCE(SUM(completion_tokens),0)::bigint   AS total_completion_tokens,
    COALESCE(SUM(total_tokens),0)::bigint        AS total_tokens,
    COALESCE(SUM(estimated_cost_usd),0)::numeric AS total_cost_usd,
    COUNT(DISTINCT user_id)::bigint              AS total_users
  FROM public.ai_token_usage
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_token_summary() TO authenticated;
