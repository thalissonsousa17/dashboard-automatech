/*
  # Corrigir permissões e criar tabelas ausentes

  1. Corrigir permissões da tabela teaching_posts
    - Conceder permissões SELECT, INSERT, UPDATE, DELETE para roles anon e authenticated
    - Recriar políticas RLS mais permissivas

  2. Criar tabelas ausentes para student submissions
    - `submission_folders` - Pastas de entrega de trabalhos
    - `student_submissions` - Trabalhos enviados pelos alunos
    - Configurar RLS e políticas adequadas

  3. Garantir que todas as operações funcionem corretamente
*/

-- Corrigir permissões da tabela teaching_posts
GRANT SELECT, INSERT, UPDATE, DELETE ON teaching_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON teaching_posts TO authenticated;

-- Remover políticas existentes da teaching_posts
DROP POLICY IF EXISTS "Users can read their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON teaching_posts;

-- Criar políticas mais permissivas para teaching_posts
CREATE POLICY "Anyone can read teaching posts"
  ON teaching_posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update their own posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can delete their own posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

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

-- Habilitar RLS na tabela submission_folders
ALTER TABLE submission_folders ENABLE ROW LEVEL SECURITY;

-- Conceder permissões para submission_folders
GRANT SELECT, INSERT, UPDATE, DELETE ON submission_folders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON submission_folders TO authenticated;

-- Políticas para submission_folders
CREATE POLICY "Anyone can read submission folders"
  ON submission_folders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create folders"
  ON submission_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update their own folders"
  ON submission_folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can delete their own folders"
  ON submission_folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Criar tabela student_submissions
CREATE TABLE IF NOT EXISTS student_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES submission_folders(id) ON DELETE CASCADE,
  student_registration text NOT NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  ai_evaluation jsonb
);

-- Habilitar RLS na tabela student_submissions
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

-- Conceder permissões para student_submissions
GRANT SELECT, INSERT, UPDATE, DELETE ON student_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_submissions TO authenticated;

-- Políticas para student_submissions
CREATE POLICY "Anyone can read submissions"
  ON student_submissions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create submissions"
  ON student_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Folder owners can update submissions"
  ON student_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submission_folders 
      WHERE submission_folders.id = student_submissions.folder_id 
      AND submission_folders.created_by = auth.uid()
    )
  );

CREATE POLICY "Folder owners can delete submissions"
  ON student_submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM submission_folders 
      WHERE submission_folders.id = student_submissions.folder_id 
      AND submission_folders.created_by = auth.uid()
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_submission_folders_created_by ON submission_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_submission_folders_share_link ON submission_folders(share_link);
CREATE INDEX IF NOT EXISTS idx_student_submissions_folder_id ON student_submissions(folder_id);

-- Criar trigger para updated_at em submission_folders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submission_folders_updated_at
    BEFORE UPDATE ON submission_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo para submission_folders
INSERT INTO submission_folders (id, name, class_name, assignment_theme, due_date, share_link, created_by) VALUES
('1', 'Trabalho Final - Automação Industrial', '3º Ano - Técnico em Informática', 'Sistemas de Automação Industrial', '2025-08-06T16:40:00Z', 'abc123', (SELECT id FROM auth.users LIMIT 1)),
('2', 'Projeto Integrador - IoT', '2º Ano - Técnico em Informática', 'Internet das Coisas e Sensores', '2025-08-30T23:59:00Z', 'def456', (SELECT id FROM auth.users LIMIT 1)),
('3', 'Trabalho de Programação', '1º Ano - Técnico em Informática', 'Fundamentos de Programação', '2025-09-15T23:59:00Z', 'z1993ykqe', (SELECT id FROM auth.users LIMIT 1)),
('4', 'Trabalho de Redes', '2º Ano - Técnico em Informática', 'Fundamentos de Redes de Computadores', '2025-10-01T23:59:00Z', 'wov8jj498', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (id) DO NOTHING;

-- Inserir dados de exemplo para student_submissions
INSERT INTO student_submissions (id, folder_id, student_registration, student_name, student_email, file_name, file_url, file_size, submitted_at, ai_evaluation) VALUES
('1', '1', '2024001234', 'João Silva', 'joao.silva@email.com', 'trabalho_automacao_joao.pdf', 'https://example.com/file1.pdf', 2048000, '2024-02-10T15:30:00Z', '{"summary": "Trabalho bem estruturado sobre automação industrial, abordando conceitos fundamentais e aplicações práticas.", "grammar_score": 8, "coherence_score": 9, "suggested_grade": 8.5, "feedback": "Excelente trabalho! Demonstra boa compreensão dos conceitos. Recomendo aprofundar a seção sobre sensores."}'),
('2', '1', '2024005678', 'Maria Santos', 'maria.santos@email.com', 'projeto_maria_automacao.pdf', 'https://example.com/file2.pdf', 1536000, '2024-02-12T09:15:00Z', null),
('3', '2', '2024009012', 'Pedro Costa', 'pedro.costa@email.com', 'iot_projeto_pedro.pdf', 'https://example.com/file3.pdf', 3072000, '2024-01-28T20:45:00Z', null)
ON CONFLICT (id) DO NOTHING;