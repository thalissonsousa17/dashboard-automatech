/*
  # Corrigir permissões de INSERT para submission_folders

  1. Problema
    - Usuários autenticados não conseguem criar pastas
    - Erro 403 permission denied ao fazer INSERT
    - Política de INSERT estava incorreta

  2. Solução
    - Corrigir política de INSERT para usuários autenticados
    - Garantir que created_by seja definido corretamente
    - Permitir INSERT apenas com created_by = auth.uid()

  3. Segurança
    - Usuários só podem criar pastas para si mesmos
    - Validação automática do created_by
    - RLS mantém isolamento entre usuários
*/

-- Remover política de INSERT existente se houver conflito
DROP POLICY IF EXISTS "Usuários podem criar suas próprias pastas" ON submission_folders;
DROP POLICY IF EXISTS "Users can create their own submission folders" ON submission_folders;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias pastas" ON submission_folders;

-- Criar política correta de INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem criar pastas"
  ON submission_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Garantir que a tabela tenha RLS habilitado
ALTER TABLE submission_folders ENABLE ROW LEVEL SECURITY;