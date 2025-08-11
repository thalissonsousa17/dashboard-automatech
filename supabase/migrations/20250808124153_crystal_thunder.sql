/*
  # Adicionar relação com profiles na tabela teaching_posts

  1. Alterações na tabela
    - Adicionar coluna `created_by` referenciando `profiles.user_id`
    - Atualizar posts existentes para ter um usuário padrão
    - Adicionar foreign key constraint

  2. Atualizar políticas RLS
    - Posts são visíveis apenas para seus criadores
    - Usuários só podem criar posts para si mesmos
    - Manter políticas de UPDATE/DELETE por proprietário

  3. Índices
    - Adicionar índice na coluna `created_by` para performance
*/

-- Adicionar coluna created_by
ALTER TABLE teaching_posts 
ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Atualizar posts existentes para ter um usuário (primeiro usuário encontrado ou null)
UPDATE teaching_posts 
SET created_by = (
  SELECT id FROM auth.users LIMIT 1
) 
WHERE created_by IS NULL;

-- Tornar a coluna obrigatória
ALTER TABLE teaching_posts 
ALTER COLUMN created_by SET NOT NULL;

-- Adicionar índice para performance
CREATE INDEX idx_teaching_posts_created_by ON teaching_posts(created_by);

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can read teaching posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON teaching_posts;

-- Criar novas políticas baseadas no usuário
CREATE POLICY "Users can read their own posts"
  ON teaching_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);