/*
  # Schema Completo da Plataforma Automatech

  ## 1. Tabelas Principais
  - `profiles` - Perfis dos usuários (professores/administradores)
  - `projects` - Projetos/trabalhos publicados
  - `submission_folders` - Pastas para recebimento de trabalhos
  - `student_submissions` - Trabalhos enviados pelos alunos
  - `config` - Configurações do sistema

  ## 2. Funcionalidades
  - Sistema de autenticação com perfis
  - Publicação de conteúdo educacional
  - Recebimento de trabalhos via links compartilháveis
  - Avaliação automática com IA
  - Configurações personalizáveis

  ## 3. Segurança
  - RLS habilitado em todas as tabelas
  - Políticas específicas para cada tipo de usuário
  - Controle de acesso baseado em roles
*/

-- Limpar tudo primeiro
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (NEW.id, NEW.email, 'admin');
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 1. TABELA PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    display_name text,
    avatar_url text,
    role text DEFAULT 'admin' CHECK (role IN ('admin', 'teacher', 'student')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis são visíveis pelos próprios usuários"
    ON profiles FOR SELECT
    TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
    ON profiles FOR INSERT
    TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON profiles FOR UPDATE
    TO public
    USING (auth.uid() = user_id);

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 2. TABELA PROJECTS (para compatibilidade)
CREATE TABLE IF NOT EXISTS projects (
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

-- RLS para projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published projects"
    ON projects FOR SELECT
    TO public
    USING (status = 'Publicado');

CREATE POLICY "Authenticated users can manage projects"
    ON projects FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger para projects
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. TABELA SUBMISSION_FOLDERS
CREATE TABLE IF NOT EXISTS submission_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    class_name text NOT NULL,
    assignment_theme text NOT NULL,
    due_date timestamptz NOT NULL,
    share_link text UNIQUE NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para submission_folders
CREATE INDEX idx_submission_folders_created_by ON submission_folders(created_by);
CREATE INDEX idx_submission_folders_is_active ON submission_folders(is_active);
CREATE INDEX idx_submission_folders_share_link ON submission_folders(share_link);

-- RLS para submission_folders
ALTER TABLE submission_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active folders for submissions"
    ON submission_folders FOR SELECT
    TO public
    USING (is_active = true);

CREATE POLICY "Authenticated users can create folders"
    ON submission_folders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can manage their own folders"
    ON submission_folders FOR ALL
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Trigger para submission_folders
CREATE TRIGGER update_submission_folders_updated_at
    BEFORE UPDATE ON submission_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. TABELA STUDENT_SUBMISSIONS
CREATE TABLE IF NOT EXISTS student_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid REFERENCES submission_folders(id) ON DELETE CASCADE NOT NULL,
    student_registration text,
    student_name text NOT NULL,
    student_email text,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint NOT NULL,
    submitted_at timestamptz DEFAULT now() NOT NULL,
    ai_evaluation jsonb
);

-- Índices para student_submissions
CREATE INDEX idx_student_submissions_folder_id ON student_submissions(folder_id);
CREATE INDEX idx_student_submissions_submitted_at ON student_submissions(submitted_at);

-- RLS para student_submissions
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert submissions to active folders"
    ON student_submissions FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM submission_folders
            WHERE submission_folders.id = student_submissions.folder_id
            AND submission_folders.is_active = true
            AND submission_folders.due_date > now()
        )
    );

CREATE POLICY "Folder owners can view all submissions"
    ON student_submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submission_folders
            WHERE submission_folders.id = student_submissions.folder_id
            AND submission_folders.created_by = auth.uid()
        )
    );

CREATE POLICY "Folder owners can update submissions (for AI evaluation)"
    ON student_submissions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM submission_folders
            WHERE submission_folders.id = student_submissions.folder_id
            AND submission_folders.created_by = auth.uid()
        )
    );

-- 5. TABELA CONFIG
CREATE TABLE IF NOT EXISTS config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_url text DEFAULT '',
    bot_name text DEFAULT 'Assistente Automatech',
    ai_test_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS para config
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage config"
    ON config FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger para config
CREATE TRIGGER update_config_updated_at
    BEFORE UPDATE ON config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. VIEW PARA PASTAS COM CONTADORES
CREATE OR REPLACE VIEW submission_folders_with_counts AS
SELECT 
    sf.*,
    COALESCE(submission_counts.submissions_count, 0) as submissions_count
FROM submission_folders sf
LEFT JOIN (
    SELECT 
        folder_id,
        COUNT(*) as submissions_count
    FROM student_submissions
    GROUP BY folder_id
) submission_counts ON sf.id = submission_counts.folder_id;

-- 7. DADOS INICIAIS
INSERT INTO config (webhook_url, bot_name, ai_test_enabled) 
VALUES (
    'https://n8n-n8n.n0gtni.easypanel.host/webhook/chatwoot-labolmed',
    'Assistente Automatech',
    true
) ON CONFLICT DO NOTHING;

-- Inserir algumas pastas de exemplo (apenas se não existirem)
INSERT INTO submission_folders (
    name, 
    class_name, 
    assignment_theme, 
    due_date, 
    share_link, 
    is_active,
    created_by
) VALUES 
(
    'Trabalho Final - Automação Industrial',
    '3º Ano - Técnico em Informática',
    'Sistemas de Automação Industrial',
    '2025-12-31 23:59:00+00',
    'abc123',
    true,
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Projeto Integrador - IoT',
    '2º Ano - Técnico em Informática', 
    'Internet das Coisas e Sensores',
    '2025-12-31 23:59:00+00',
    'def456',
    true,
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Trabalho de Programação',
    '1º Ano - Técnico em Informática',
    'Fundamentos de Programação',
    '2025-12-31 23:59:00+00',
    'z1993ykqe',
    true,
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Trabalho de Redes',
    '2º Ano - Técnico em Informática',
    'Fundamentos de Redes de Computadores',
    '2025-12-31 23:59:00+00',
    'wov8jj498',
    true,
    (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (share_link) DO NOTHING;

-- Inserir alguns projetos de exemplo
INSERT INTO projects (
    name,
    description,
    category,
    client_type,
    status,
    tags
) VALUES 
(
    'Sistema de Automação Residencial',
    'Projeto completo de automação residencial com IoT',
    'Automação',
    'Pessoa Física',
    'Publicado',
    ARRAY['IoT', 'Automação', 'Casa Inteligente']
),
(
    'Controle Industrial de Processos',
    'Sistema de controle para linha de produção industrial',
    'Automação',
    'Empresa', 
    'Publicado',
    ARRAY['Indústria', 'CLP', 'Sensores']
)
ON CONFLICT DO NOTHING;

-- Garantir permissões
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;