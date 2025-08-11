/*
  # Corrigir permissões RLS para submission_folders

  1. Políticas de Segurança
    - Permitir acesso público para leitura via share_link
    - Usuários autenticados podem gerenciar suas próprias pastas
    - Acesso anônimo para submissões de trabalhos

  2. Funcionalidades
    - Estudantes podem acessar pastas via link compartilhado
    - Professores podem criar e gerenciar suas pastas
    - Sistema de submissões funciona para usuários não autenticados
*/

-- Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Acesso público via share_link" ON submission_folders;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias pastas" ON submission_folders;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias pastas" ON submission_folders;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias pastas" ON submission_folders;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias pastas" ON submission_folders;

-- Política para acesso público via share_link (permite que estudantes acessem a pasta para submissão)
CREATE POLICY "Acesso público para submissões"
  ON submission_folders
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Política para usuários autenticados verem suas próprias pastas
CREATE POLICY "Usuários podem ver suas próprias pastas"
  ON submission_folders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Política para usuários autenticados criarem suas próprias pastas
CREATE POLICY "Usuários podem criar suas próprias pastas"
  ON submission_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Política para usuários autenticados atualizarem suas próprias pastas
CREATE POLICY "Usuários podem atualizar suas próprias pastas"
  ON submission_folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Política para usuários autenticados deletarem suas próprias pastas
CREATE POLICY "Usuários podem deletar suas próprias pastas"
  ON submission_folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);