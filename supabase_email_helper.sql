-- ============================================================
-- HELPER: Função para buscar user_id por email (acessa auth.users)
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Concede acesso ao service_role (usado pelas Edge Functions)
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
