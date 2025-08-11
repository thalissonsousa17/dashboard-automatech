/*
  # Atualizar tabela profiles com campos ausentes

  1. Alterações na Tabela
    - Adicionar coluna `bio` (text)
    - Adicionar coluna `slug` (text, unique)
    - Adicionar coluna `is_public` (boolean, default false)
    - Atualizar constraint de role para incluir 'teacher' e 'student'
    - Criar índice único para slug
    - Gerar slugs automáticos para perfis existentes

  2. Segurança
    - Manter políticas RLS existentes
    - Adicionar validação para slug único
    - Controle de visibilidade pública

  3. Dados Existentes
    - Preservar dados atuais
    - Gerar slugs baseados no display_name ou email
    - Definir perfis como privados por padrão
*/

-- Adicionar colunas ausentes se não existirem
DO $$
BEGIN
  -- Adicionar coluna bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  -- Adicionar coluna slug
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE profiles ADD COLUMN slug text;
  END IF;

  -- Adicionar coluna is_public
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;

-- Atualizar constraint de role para incluir teacher e student
DO $$
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Adicionar nova constraint
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'teacher'::text, 'student'::text]));
END $$;

-- Gerar slugs para perfis existentes que não têm slug
UPDATE profiles 
SET slug = LOWER(REGEXP_REPLACE(
  COALESCE(display_name, SPLIT_PART((
    SELECT email FROM auth.users WHERE id = profiles.user_id
  ), '@', 1)), 
  '[^a-zA-Z0-9]', '-', 'g'
)) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Criar índice único para slug se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'profiles_slug_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_slug_key ON profiles(slug);
  END IF;
END $$;

-- Definir slug como NOT NULL após gerar valores
ALTER TABLE profiles ALTER COLUMN slug SET NOT NULL;

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(base_text text, user_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Limpar e normalizar o texto base
  base_slug := LOWER(REGEXP_REPLACE(
    COALESCE(base_text, 'user'), 
    '[^a-zA-Z0-9]', '-', 'g'
  ));
  
  -- Remover hífens duplos e no início/fim
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  base_slug := TRIM(base_slug, '-');
  
  -- Se ficou vazio, usar 'user'
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;
  
  final_slug := base_slug;
  
  -- Verificar se já existe e adicionar contador se necessário
  WHILE EXISTS (
    SELECT 1 FROM profiles 
    WHERE slug = final_slug AND user_id != generate_unique_slug.user_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION handle_profile_slug()
RETURNS trigger AS $$
BEGIN
  -- Se slug não foi fornecido ou está vazio, gerar automaticamente
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_slug(NEW.display_name, NEW.user_id);
  ELSE
    -- Validar e limpar slug fornecido
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.slug, '[^a-zA-Z0-9-]', '', 'g'));
    NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
    NEW.slug := TRIM(NEW.slug, '-');
    
    -- Se ficou vazio após limpeza, gerar automaticamente
    IF NEW.slug = '' THEN
      NEW.slug := generate_unique_slug(NEW.display_name, NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS profile_slug_trigger ON profiles;
CREATE TRIGGER profile_slug_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_slug();

-- Atualizar políticas RLS para incluir slug e is_public
DROP POLICY IF EXISTS "Perfis públicos são visíveis para todos" ON profiles;
CREATE POLICY "Perfis públicos são visíveis para todos"
  ON profiles
  FOR SELECT
  TO public
  USING (is_public = true);

DROP POLICY IF EXISTS "Usuários podem ver perfis públicos por slug" ON profiles;
CREATE POLICY "Usuários podem ver perfis públicos por slug"
  ON profiles
  FOR SELECT
  TO public
  USING (is_public = true);