-- EDITOR DE DOCUMENTOS - SCHEMA ADITIVO
-- Executar APÓS supabase_setup.sql e supabase_premium_setup.sql

-- Tabela: DOCUMENTOS STANDALONE
-- Permite que professores criem documentos livres sem vincular a uma prova
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL DEFAULT 'Documento sem título',
    content_json jsonb,
    content_html text,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índice para listagem por usuário
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documents"
    ON documents FOR ALL TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Admin can read all documents"
    ON documents FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
