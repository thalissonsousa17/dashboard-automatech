/*
  # Adicionar slug aos perfis para páginas públicas de professores

  1. Alterações na tabela profiles
    - Adicionar coluna `slug` (único, para URLs públicas)
    - Adicionar coluna `bio` (descrição do professor)
    - Adicionar coluna `is_public` (controle de visibilidade)

  2. Políticas RLS
    - Permitir leitura pública de perfis públicos
    - Usuários podem editar apenas seu próprio perfil

  3. Alterações na tabela teaching_posts
    - Permitir leitura pública de posts de professores com perfil público
*/

-- Adicionar colunas ao perfil
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Criar índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;

-- Atualizar políticas RLS para profiles
DROP POLICY IF EXISTS "Perfis são visíveis pelos próprios usuários" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON profiles;

-- Novas políticas para profiles
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read public profiles"
  ON profiles FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Atualizar políticas para teaching_posts para permitir acesso público
DROP POLICY IF EXISTS "Users can read their own teaching posts" ON teaching_posts;

-- Nova política para leitura pública de posts de professores públicos
CREATE POLICY "Public can read posts from public teachers"
  ON teaching_posts FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = teaching_posts.created_by 
      AND profiles.is_public = true
    )
  );

-- Política para usuários autenticados lerem seus próprios posts
CREATE POLICY "Users can read their own teaching posts"
  ON teaching_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Manter outras políticas de teaching_posts
CREATE POLICY "Users can create their own teaching posts"
  ON teaching_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own teaching posts"
  ON teaching_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own teaching posts"
  ON teaching_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Inserir perfil de exemplo
INSERT INTO profiles (user_id, display_name, slug, bio, is_public, role)
VALUES (
  'cfa58819-2a7a-4b58-93c7-1c1cb58d461c',
  'Prof. João Silva',
  'prof-joao-silva',
  'Professor especialista em Automação Industrial com mais de 10 anos de experiência.',
  true,
  'teacher'
) ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  is_public = EXCLUDED.is_public,
  role = EXCLUDED.role;