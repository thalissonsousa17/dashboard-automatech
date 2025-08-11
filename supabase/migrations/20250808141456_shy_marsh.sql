/*
  # Criar tabela submission_folders para Nova Pasta de Entrega

  1. Nova Tabela
    - `submission_folders`
      - `id` (uuid, primary key)
      - `name` (text, nome da pasta)
      - `class_name` (text, nome da turma)
      - `assignment_theme` (text, tema do trabalho)
      - `due_date` (timestamptz, prazo limite)
      - `share_link` (text, link único para compartilhamento)
      - `is_active` (boolean, se a pasta está ativa)
      - `created_by` (uuid, referência ao usuário criador)
      - `created_at` (timestamptz, data de criação)
      - `updated_at` (timestamptz, data de atualização)
      - `submissions_count` (integer, contador de submissões)

  2. Segurança
    - Enable RLS na tabela `submission_folders`
    - Políticas para usuários autenticados gerenciarem suas pastas
    - Política para acesso público via share_link

  3. Índices
    - Índice no share_link para busca rápida
    - Índice no created_by para filtrar por usuário
    - Índice no created_at para ordenação
*/

-- Criar tabela submission_folders
CREATE TABLE IF NOT EXISTS submission_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_name text NOT NULL,
  assignment_theme text NOT NULL,
  due_date timestamptz NOT NULL,
  share_link text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submissions_count integer DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE submission_folders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem criar suas próprias pastas"
  ON submission_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem ver suas próprias pastas"
  ON submission_folders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar suas próprias pastas"
  ON submission_folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar suas próprias pastas"
  ON submission_folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Acesso público via share_link"
  ON submission_folders
  FOR SELECT
  TO public
  USING (is_active = true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_submission_folders_share_link 
  ON submission_folders(share_link);

CREATE INDEX IF NOT EXISTS idx_submission_folders_created_by 
  ON submission_folders(created_by);

CREATE INDEX IF NOT EXISTS idx_submission_folders_created_at 
  ON submission_folders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_folders_due_date 
  ON submission_folders(due_date);

-- Função para gerar share_link único
CREATE OR REPLACE FUNCTION generate_unique_share_link()
RETURNS text AS $$
DECLARE
  new_link text;
  link_exists boolean;
BEGIN
  LOOP
    -- Gerar link aleatório de 9 caracteres
    new_link := lower(substring(md5(random()::text) from 1 for 9));
    
    -- Verificar se já existe
    SELECT EXISTS(
      SELECT 1 FROM submission_folders WHERE share_link = new_link
    ) INTO link_exists;
    
    -- Se não existe, usar este link
    IF NOT link_exists THEN
      RETURN new_link;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar share_link automaticamente
CREATE OR REPLACE FUNCTION set_share_link()
RETURNS trigger AS $$
BEGIN
  IF NEW.share_link IS NULL OR NEW.share_link = '' THEN
    NEW.share_link := generate_unique_share_link();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_share_link
  BEFORE INSERT ON submission_folders
  FOR EACH ROW
  EXECUTE FUNCTION set_share_link();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_submission_folders_updated_at
  BEFORE UPDATE ON submission_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();