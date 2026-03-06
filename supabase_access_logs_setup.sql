-- =====================================================
-- SISTEMA DE LOG DE ACESSOS COM GEOLOCALIZAÇÃO
-- Execute no Supabase SQL Editor
-- Executar APÓS supabase_setup.sql (usa tabela profiles)
-- =====================================================

-- 1. Tabela principal de logs de acesso
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,

  -- Dados de rede
  ip_address TEXT NOT NULL,

  -- Geolocalização (preenchido via ip-api.com no frontend)
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone TEXT,
  isp TEXT,

  -- Status
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),

  -- Metadados do dispositivo
  user_agent TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,

  -- Timestamps
  logged_in_at  TIMESTAMPTZ DEFAULT NOW(),
  logged_out_at TIMESTAMPTZ,
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id     ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_status      ON public.access_logs(status);
CREATE INDEX IF NOT EXISTS idx_access_logs_logged_in   ON public.access_logs(logged_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_country     ON public.access_logs(country);

-- 3. Row Level Security
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins leem todos os logs (usa tabela profiles do projeto)
CREATE POLICY "Admin can read all access logs"
  ON public.access_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Qualquer usuário autenticado pode inserir seu próprio log
CREATE POLICY "Users can insert own access logs"
  ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Usuário pode atualizar (heartbeat / logout) apenas seu próprio log
CREATE POLICY "Users can update own access logs"
  ON public.access_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 4. RPC: marcar usuário offline
CREATE OR REPLACE FUNCTION public.mark_user_offline(p_log_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.access_logs
  SET status = 'offline', logged_out_at = NOW()
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: heartbeat (atualiza last_seen)
CREATE OR REPLACE FUNCTION public.update_last_seen(p_log_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.access_logs
  SET last_seen_at = NOW()
  WHERE id = p_log_id AND status = 'online';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. View: usuários online agora (sem heartbeat há menos de 5 min)
CREATE OR REPLACE VIEW public.online_users AS
SELECT
  id, user_email, user_name, ip_address,
  country, country_code, city, latitude, longitude,
  device_type, browser, os, logged_in_at, last_seen_at
FROM public.access_logs
WHERE status = 'online'
  AND last_seen_at > NOW() - INTERVAL '5 minutes';

-- 7. View: estatísticas por país (usada pelo dashboard)
CREATE OR REPLACE VIEW public.access_stats_by_country AS
SELECT
  country,
  country_code,
  COUNT(*)                                          AS total_accesses,
  COUNT(DISTINCT user_id)                           AS unique_users,
  SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS currently_online,
  MAX(logged_in_at)                                 AS last_access
FROM public.access_logs
GROUP BY country, country_code
ORDER BY total_accesses DESC;
