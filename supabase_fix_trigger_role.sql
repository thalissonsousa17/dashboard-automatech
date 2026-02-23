-- ============================================================
-- FIX: Trigger de criação de perfil + role dos usuários
-- PROBLEMA: trigger hardcoded 'admin' para todos os novos usuários
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. Corrigir o trigger (lê role do user_metadata, default 'professor') ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'professor')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ── 2. Garantir que a constraint de role permite 'professor' ──
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'professor', 'teacher', 'student'));

-- ── 3. Corrigir o perfil de teste (morgannabioarquivos) para 'professor' ──
-- IMPORTANTE: só altera o perfil que deveria ser professor, não toca nos admins reais
UPDATE public.profiles
SET role = 'professor'
WHERE user_id = '44d4068c-3b90-48c9-ac56-dd50090b8a42';

-- ── 4. Adicionar política RLS para que o formulário de cadastro
--       consiga verificar se já existe um admin (sem estar logado) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'anon_count_admins'
  ) THEN
    CREATE POLICY "anon_count_admins" ON public.profiles
        FOR SELECT TO anon
        USING (role = 'admin');
  END IF;
END $$;

-- ── 5. Verificação final ──
SELECT user_id, display_name, role, created_at
FROM public.profiles
ORDER BY created_at;
