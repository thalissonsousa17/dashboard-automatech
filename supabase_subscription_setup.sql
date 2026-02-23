-- ============================================================
-- ASSINATURAS — Planos, Subscriptions e Trigger free
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text          NOT NULL,
  slug            text          UNIQUE NOT NULL,  -- 'free' | 'starter' | 'pro' | 'premium'
  price_brl       numeric(10,2) NOT NULL,
  stripe_price_id text,
  features        jsonb         NOT NULL,
  is_active       boolean       DEFAULT true,
  created_at      timestamptz   DEFAULT now()
);

-- 2. Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                   uuid        REFERENCES public.plans(id),
  stripe_subscription_id    text        UNIQUE,
  stripe_customer_id        text,
  status                    text        NOT NULL DEFAULT 'active',
  -- status: 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean     DEFAULT false,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);

-- 3. RLS
ALTER TABLE public.plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Planos são públicos para leitura
CREATE POLICY "plans_public_read" ON public.plans
  FOR SELECT USING (true);

-- Assinaturas: usuário vê apenas a própria
CREATE POLICY "subscriptions_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 4. Inserir planos (com IDs reais do Stripe)
INSERT INTO public.plans (name, slug, price_brl, stripe_price_id, features)
VALUES
(
  'Gratuito', 'free', 0.00, NULL,
  '{
    "provas_mes": 1,
    "tipos_prova": 1,
    "workspaces": 1,
    "pastas_trabalhos": 1,
    "publicar_material": false,
    "editor_documentos": "limitado",
    "qr_chamada": false,
    "anotacoes": 1,
    "suporte": false
  }'::jsonb
),
(
  'Starter', 'starter', 29.00, 'price_1T3lznBNpKinyuTebIjzvY2Q',
  '{
    "provas_mes": 15,
    "tipos_prova": 3,
    "workspaces": 5,
    "pastas_trabalhos": 5,
    "publicar_material": true,
    "editor_documentos": "completo",
    "qr_chamada": true,
    "anotacoes": 10,
    "suporte": "email"
  }'::jsonb
),
(
  'Pro', 'pro', 79.00, 'price_1T3m1TBNpKinyuTe4WsXqaLj',
  '{
    "provas_mes": 30,
    "tipos_prova": 5,
    "workspaces": 15,
    "pastas_trabalhos": 15,
    "publicar_material": true,
    "editor_documentos": "completo",
    "qr_chamada": true,
    "anotacoes": -1,
    "suporte": "prioritario"
  }'::jsonb
),
(
  'Premium', 'premium', 99.00, 'price_1T3m2UBNpKinyuTeIJnC6AHE',
  '{
    "provas_mes": -1,
    "tipos_prova": -1,
    "workspaces": -1,
    "pastas_trabalhos": -1,
    "publicar_material": true,
    "editor_documentos": "completo",
    "qr_chamada": true,
    "anotacoes": -1,
    "suporte": "dedicado"
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET stripe_price_id = EXCLUDED.stripe_price_id,
      price_brl       = EXCLUDED.price_brl,
      features        = EXCLUDED.features;

-- 5. Trigger: cria assinatura free ao cadastrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan_id uuid;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.plans WHERE slug = 'free' LIMIT 1;
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      user_id, plan_id, status,
      current_period_start, current_period_end
    )
    VALUES (
      NEW.id,
      v_free_plan_id,
      'active',
      now(),
      now() + interval '100 years'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- 6. Criar assinaturas free para usuários EXISTENTES que ainda não têm assinatura
INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
SELECT
  p.user_id,
  (SELECT id FROM public.plans WHERE slug = 'free'),
  'active',
  now(),
  now() + interval '100 years'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.user_id
);
