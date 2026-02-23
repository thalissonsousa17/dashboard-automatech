-- ============================================================
-- ATUALIZAÇÃO: get_admin_user_logs com dados de assinatura
-- Execute este script no SQL Editor do Supabase
-- (usa CREATE OR REPLACE — seguro para rodar mais de uma vez)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_user_logs(
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
  -- campos de assinatura
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
    MAX(us.login_at)                        AS last_login,
    COALESCE(SUM(us.duration_seconds), 0)   AS total_session_seconds,
    COALESCE(SUM(atu.prompt_tokens),    0)  AS prompt_tokens,
    COALESCE(SUM(atu.completion_tokens),0)  AS completion_tokens,
    COALESCE(SUM(atu.total_tokens),     0)  AS total_tokens,
    COALESCE(SUM(atu.estimated_cost_usd),0)::numeric AS estimated_cost_usd,
    -- assinatura (LATERAL garante 1 linha por usuário — a mais recente/ativa)
    sub.plan_name,
    sub.plan_slug,
    sub.plan_price_brl,
    sub.subscription_status,
    sub.subscription_since,
    sub.subscription_end,
    COALESCE(sub.cancel_at_period_end, false) AS cancel_at_period_end
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  -- pega a assinatura mais relevante do usuário (ativa primeiro, depois a mais recente)
  LEFT JOIN LATERAL (
    SELECT
      pl.name          AS plan_name,
      pl.slug          AS plan_slug,
      pl.price_brl     AS plan_price_brl,
      s.status         AS subscription_status,
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
  WHERE p.role = 'professor'
  GROUP BY
    p.user_id, au.email, au.phone, p.display_name,
    sub.plan_name, sub.plan_slug, sub.plan_price_brl,
    sub.subscription_status, sub.subscription_since,
    sub.subscription_end, sub.cancel_at_period_end
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_logs(timestamptz, timestamptz) TO authenticated;
