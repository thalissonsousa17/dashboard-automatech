
-- SCHEMA COMPLETO DO PROJETO DASHBOARD PROFESSOR EDU

-- 1. CONFIGURAÇÕES INICIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. TABELAS

-- [PROFILES]
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    display_name text,
    avatar_url text,
    bio text,
    slug text UNIQUE,
    is_public boolean DEFAULT false,
    role text DEFAULT 'professor' CHECK (role IN ('admin', 'professor', 'teacher', 'student')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Trigger para criar perfil automaticamente após signup
-- Lê o role do user_metadata (passado no signUp), default 'professor'
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'professor')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- [PROJECTS]
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    client_type text NOT NULL CHECK (client_type IN ('Empresa', 'Pessoa Física')),
    image_url text,
    tags text[] DEFAULT '{}',
    status text DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Publicado')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- [TEACHING POSTS]
CREATE TABLE IF NOT EXISTS public.teaching_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  author text NOT NULL,
  subject text,
  grade_level text,
  files jsonb DEFAULT '[]'::jsonb,
  videos jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}',
  likes integer DEFAULT 0,
  views integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- [SUBMISSION FOLDERS]
CREATE TABLE IF NOT EXISTS public.submission_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    class_name text NOT NULL,
    assignment_theme text NOT NULL,
    due_date timestamptz NOT NULL,
    share_link text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    submissions_count integer DEFAULT 0
);

-- [STUDENT SUBMISSIONS]
CREATE TABLE IF NOT EXISTS public.student_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid REFERENCES public.submission_folders(id) ON DELETE CASCADE NOT NULL,
    student_registration text NOT NULL,
    student_name text NOT NULL,
    student_email text,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint NOT NULL,
    submitted_at timestamptz DEFAULT now() NOT NULL,
    ai_evaluation jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- [CONFIG]
CREATE TABLE IF NOT EXISTS public.config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_url text DEFAULT '',
    bot_name text DEFAULT 'Assistente Automatech',
    ai_test_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- [NOTES]
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (POLITICAS DE SEGURANÇA)

-- [PROFILES POLICIES]
CREATE POLICY "Public profiles are readable by everyone" ON profiles FOR SELECT TO public USING (is_public = true);
CREATE POLICY "Users can read their own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Permitir consulta pública da existência de admin (para tela de login)
CREATE POLICY "Anyone can check admin existence" ON profiles FOR SELECT TO anon USING (role = 'admin');
-- Admin pode ler todos os perfis (para painel admin)
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
);

-- Garantir apenas 1 admin no sistema
CREATE UNIQUE INDEX IF NOT EXISTS unique_admin_role ON profiles(role) WHERE role = 'admin';

-- [PROJECTS POLICIES]
CREATE POLICY "Public can read published projects" ON projects FOR SELECT TO public USING (status = 'Publicado');
CREATE POLICY "Authenticated users can manage projects" ON projects FOR ALL TO authenticated USING (true);

-- [TEACHING POSTS POLICIES]
CREATE POLICY "Anyone can read teaching posts" ON teaching_posts FOR SELECT TO public USING (true);
CREATE POLICY "Users can create their own teaching posts" ON teaching_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own teaching posts" ON teaching_posts FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own teaching posts" ON teaching_posts FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- [SUBMISSION FOLDERS POLICIES]
CREATE POLICY "Acesso público via share_link" ON submission_folders FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Usuários podem ver suas próprias pastas" ON submission_folders FOR SELECT TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Usuários autenticados podem criar pastas" ON submission_folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Usuários podem atualizar suas próprias pastas" ON submission_folders FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Usuários podem deletar suas próprias pastas" ON submission_folders FOR DELETE TO authenticated USING (auth.uid() = created_by);
-- Admin pode ler todas as pastas
CREATE POLICY "Admin can read all submission folders" ON submission_folders FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- [STUDENT SUBMISSIONS POLICIES]
CREATE POLICY "Anyone can create submissions via share link" ON student_submissions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Folder owners can view submissions" ON student_submissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM submission_folders WHERE id = student_submissions.folder_id AND created_by = auth.uid()));
CREATE POLICY "Folder owners can update submissions" ON student_submissions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM submission_folders WHERE id = student_submissions.folder_id AND created_by = auth.uid()));
CREATE POLICY "Folder owners can delete submissions" ON student_submissions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM submission_folders WHERE id = student_submissions.folder_id AND created_by = auth.uid()));
-- Admin pode ler todas as submissões
CREATE POLICY "Admin can read all student submissions" ON student_submissions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- [CONFIG POLICIES]
CREATE POLICY "Authenticated users can manage config" ON config FOR ALL TO authenticated USING (true);

-- [NOTES POLICIES]
CREATE POLICY "Users can manage their own notes" ON notes FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 5. STORAGE BUCKETS
-- Criação do bucket 'teaching-posts-files' (idempotente via insert on conflict ou verificação)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teaching-posts-files',
  'teaching-posts-files',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','application/pdf','application/zip']
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies (ajustado para usar nome do bucket como string fixa se necessário, ou lógica mais simples)
-- Nota: Políticas de storage com trigger complexo podem falhar se a extensão não estiver habilitada. Simplificando.
CREATE POLICY "Public read access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'teaching-posts-files');
CREATE POLICY "Auth users upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'teaching-posts-files');
-- Políticas de update/delete simplificadas (proprietário é auth.uid)
-- CREATE POLICY "Users update own files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'teaching-posts-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. TRIGGERS RESTART
-- Re-aplicar triggers de updated_at para todas as tabelas
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teaching_posts_updated_at BEFORE UPDATE ON teaching_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_folders_updated_at BEFORE UPDATE ON submission_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para contar submissões
CREATE OR REPLACE FUNCTION update_submissions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.submission_folders SET submissions_count = submissions_count + 1 WHERE id = NEW.folder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.submission_folders SET submissions_count = submissions_count - 1 WHERE id = OLD.folder_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_submissions_count_trigger
    AFTER INSERT OR DELETE ON public.student_submissions
    FOR EACH ROW EXECUTE FUNCTION update_submissions_count();

-- =============================================
-- MÓDULO DE GERAÇÃO DE PROVAS COM IA
-- =============================================

-- [PROVAS] - Prova principal criada pelo professor
CREATE TABLE IF NOT EXISTS public.exams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subject text NOT NULL,
    question_count integer NOT NULL DEFAULT 10,
    question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'essay', 'mixed')),
    difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    reference_material text,
    mixed_mc_count integer,
    mixed_essay_count integer,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'finalized')),
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- [QUESTÕES] - Questões de cada prova
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    question_number integer NOT NULL,
    question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'essay')),
    statement text NOT NULL,
    alternatives jsonb DEFAULT '[]'::jsonb,
    correct_answer text,
    explanation text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- [VERSÕES DA PROVA] - Versões embaralhadas (A, B, C... até J)
CREATE TABLE IF NOT EXISTS public.exam_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    version_label text NOT NULL,
    question_order jsonb NOT NULL,
    alternatives_order jsonb NOT NULL,
    qr_code_data text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- [GABARITOS] - Gabarito de cada versão
CREATE TABLE IF NOT EXISTS public.exam_answer_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    version_id uuid REFERENCES public.exam_versions(id) ON DELETE CASCADE NOT NULL,
    answers jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS para tabelas de provas
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answer_keys ENABLE ROW LEVEL SECURITY;

-- Policies de provas
CREATE POLICY "Users can manage their own exams" ON exams FOR ALL TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Users can manage questions of their exams" ON exam_questions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_questions.exam_id AND exams.created_by = auth.uid()));
CREATE POLICY "Users can manage versions of their exams" ON exam_versions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_versions.exam_id AND exams.created_by = auth.uid()));
CREATE POLICY "Users can manage answer keys of their exams" ON exam_answer_keys FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_answer_keys.exam_id AND exams.created_by = auth.uid()));

-- Admin pode ler todas as provas
CREATE POLICY "Admin can read all exams" ON exams FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Triggers de updated_at
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_questions_updated_at BEFORE UPDATE ON exam_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir config inicial
INSERT INTO config (webhook_url, bot_name, ai_test_enabled)
VALUES ('', 'Assistente Automatech', true)
ON CONFLICT DO NOTHING;
