/*
  # Criar tabelas para sistema de submissões de alunos

  1. Novas Tabelas
    - `submission_folders`
      - `id` (uuid, primary key)
      - `name` (text, nome da pasta)
      - `class_name` (text, nome da turma)
      - `assignment_theme` (text, tema do trabalho)
      - `due_date` (timestamptz, prazo de entrega)
      - `share_link` (text, link único para compartilhamento)
      - `is_active` (boolean, se a pasta está ativa)
      - `created_by` (uuid, referência ao usuário criador)
      - `created_at` (timestamptz, data de criação)
      - `submissions_count` (integer, contador de submissões)

    - `student_submissions`
      - `id` (uuid, primary key)
      - `folder_id` (uuid, referência à pasta)
      - `student_registration` (text, matrícula do aluno)
      - `student_name` (text, nome do aluno)
      - `student_email` (text, email do aluno)
      - `file_name` (text, nome do arquivo)
      - `file_url` (text, URL do arquivo)
      - `file_size` (integer, tamanho do arquivo)
      - `submitted_at` (timestamptz, data de submissão)
      - `ai_evaluation` (jsonb, avaliação da IA)

  2. Segurança
    - Habilitar RLS em ambas as tabelas
    - Políticas para leitura e escrita baseadas em autenticação
    - Usuários podem gerenciar suas próprias pastas
    - Submissões públicas podem ser lidas por qualquer um

  3. Índices
    - Índices para otimizar consultas por data, usuário e pasta
</sql>

-- Criar tabela de pastas de submissão
CREATE TABLE IF NOT EXISTS public.submission_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    class_name text NOT NULL,
    assignment_theme text NOT NULL,
    due_date timestamptz NOT NULL,
    share_link text UNIQUE NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    submissions_count integer DEFAULT 0 NOT NULL
);

-- Criar tabela de submissões de alunos
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid REFERENCES public.submission_folders(id) ON DELETE CASCADE,
    student_registration text NOT NULL,
    student_name text NOT NULL,
    student_email text,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size integer NOT NULL,
    submitted_at timestamptz DEFAULT now() NOT NULL,
    ai_evaluation jsonb
);

-- Habilitar RLS
ALTER TABLE public.submission_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- Políticas para submission_folders
CREATE POLICY "Usuários podem criar suas próprias pastas"
    ON public.submission_folders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem ver suas próprias pastas"
    ON public.submission_folders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar suas próprias pastas"
    ON public.submission_folders
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar suas próprias pastas"
    ON public.submission_folders
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Políticas para student_submissions
CREATE POLICY "Qualquer um pode criar submissões"
    ON public.student_submissions
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Proprietários de pastas podem ver submissões"
    ON public.student_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submission_folders
            WHERE id = folder_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Proprietários de pastas podem atualizar submissões"
    ON public.student_submissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submission_folders
            WHERE id = folder_id AND created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.submission_folders
            WHERE id = folder_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Proprietários de pastas podem deletar submissões"
    ON public.student_submissions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submission_folders
            WHERE id = folder_id AND created_by = auth.uid()
        )
    );

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_submission_folders_created_by ON public.submission_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_submission_folders_created_at ON public.submission_folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_folders_share_link ON public.submission_folders(share_link);

CREATE INDEX IF NOT EXISTS idx_student_submissions_folder_id ON public.student_submissions(folder_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_submitted_at ON public.student_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student_registration ON public.student_submissions(student_registration);

-- Função para atualizar contador de submissões
CREATE OR REPLACE FUNCTION update_submissions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.submission_folders
        SET submissions_count = submissions_count + 1
        WHERE id = NEW.folder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.submission_folders
        SET submissions_count = submissions_count - 1
        WHERE id = OLD.folder_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador automaticamente
CREATE TRIGGER update_submissions_count_trigger
    AFTER INSERT OR DELETE ON public.student_submissions
    FOR EACH ROW EXECUTE FUNCTION update_submissions_count();