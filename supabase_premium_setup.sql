-- =============================================
-- PREMIUM FEATURES - SCHEMA ADITIVO
-- Executar APÓS supabase_setup.sql
-- NÃO modifica tabelas existentes (apenas ADD COLUMN)
-- =============================================

-- =============================================
-- 1. TABELA: WORKSPACES DE PROVAS
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6',
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 2. TABELA: PASTAS DE PROVAS (nesting infinito)
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    workspace_id uuid REFERENCES public.exam_workspaces(id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES public.exam_folders(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT no_self_parent CHECK (id != parent_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_folders_parent ON exam_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_exam_folders_workspace ON exam_folders(workspace_id);

-- =============================================
-- 3. TABELA: TEMPLATES DE PROVA
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    source_exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
    subject text NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'essay', 'mixed')),
    difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_count integer NOT NULL,
    mixed_mc_count integer,
    mixed_essay_count integer,
    reference_material text,
    questions_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT false,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 4. TABELA: CONTEÚDO EDITADO (Tiptap)
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_edited_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL UNIQUE,
    content_json jsonb,
    content_html text,
    last_edited_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 5. ALTER TABLE: Campos opcionais em exams
-- =============================================
ALTER TABLE public.exams
    ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.exam_workspaces(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.exam_folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_exams_workspace ON exams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_exams_folder ON exams(folder_id);

-- =============================================
-- 6. RLS (Row Level Security)
-- =============================================

-- WORKSPACES
ALTER TABLE exam_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workspaces"
    ON exam_workspaces FOR ALL TO authenticated
    USING (auth.uid() = created_by);
CREATE POLICY "Admin can read all workspaces"
    ON exam_workspaces FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- FOLDERS
ALTER TABLE exam_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own folders"
    ON exam_folders FOR ALL TO authenticated
    USING (auth.uid() = created_by);
CREATE POLICY "Admin can read all folders"
    ON exam_folders FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- TEMPLATES
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own templates"
    ON exam_templates FOR ALL TO authenticated
    USING (auth.uid() = created_by);
CREATE POLICY "Users can read public templates"
    ON exam_templates FOR SELECT TO authenticated
    USING (is_public = true);
CREATE POLICY "Admin can read all templates"
    ON exam_templates FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- EDITED CONTENT
ALTER TABLE exam_edited_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage edited content of their exams"
    ON exam_edited_content FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM exams
        WHERE exams.id = exam_edited_content.exam_id
        AND exams.created_by = auth.uid()
    ));

-- =============================================
-- 7. TRIGGERS
-- =============================================
CREATE TRIGGER update_exam_workspaces_updated_at
    BEFORE UPDATE ON exam_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_folders_updated_at
    BEFORE UPDATE ON exam_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_templates_updated_at
    BEFORE UPDATE ON exam_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_edited_content_updated_at
    BEFORE UPDATE ON exam_edited_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. FUNÇÃO: Caminho completo da pasta (breadcrumb)
-- =============================================
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid uuid)
RETURNS TABLE(id uuid, name text, parent_id uuid, depth integer) AS $$
    WITH RECURSIVE folder_path AS (
        SELECT f.id, f.name, f.parent_id, 0 as depth
        FROM exam_folders f
        WHERE f.id = folder_uuid
        UNION ALL
        SELECT f.id, f.name, f.parent_id, fp.depth + 1
        FROM exam_folders f
        INNER JOIN folder_path fp ON f.id = fp.parent_id
    )
    SELECT * FROM folder_path ORDER BY depth DESC;
$$ LANGUAGE sql STABLE;

-- =============================================
-- 9. ALTER TABLE: questions_json em exam_versions
--    (necessário para o editor abrir versões embaralhadas)
-- =============================================
ALTER TABLE public.exam_versions
    ADD COLUMN IF NOT EXISTS questions_json jsonb DEFAULT '[]'::jsonb;
