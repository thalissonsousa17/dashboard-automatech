/*
  # Criar tabela para posts do Espaço Docente

  1. Nova Tabela
    - `teaching_posts`
      - `id` (uuid, primary key)
      - `title` (text, título da publicação)
      - `description` (text, descrição do conteúdo)
      - `author` (text, nome do professor)
      - `subject` (text, disciplina)
      - `grade_level` (text, nível de ensino)
      - `files` (jsonb, array de arquivos)
      - `videos` (jsonb, array de vídeos)
      - `images` (jsonb, array de imagens)
      - `tags` (text[], array de tags)
      - `likes` (integer, número de curtidas)
      - `views` (integer, número de visualizações)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `teaching_posts`
    - Política para usuários autenticados criarem posts
    - Política para leitura pública dos posts
    - Política para autores editarem seus próprios posts

  3. Triggers
    - Trigger para atualizar `updated_at` automaticamente
*/

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar tabela teaching_posts
CREATE TABLE IF NOT EXISTS teaching_posts (
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
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE teaching_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem criar posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Todos podem ler posts"
  ON teaching_posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Autores podem atualizar seus próprios posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Autores podem deletar seus próprios posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_teaching_posts_updated_at
  BEFORE UPDATE ON teaching_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_teaching_posts_created_by ON teaching_posts(created_by);
CREATE INDEX IF NOT EXISTS idx_teaching_posts_subject ON teaching_posts(subject);
CREATE INDEX IF NOT EXISTS idx_teaching_posts_created_at ON teaching_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_posts_tags ON teaching_posts USING GIN(tags);

-- Inserir dados de exemplo
INSERT INTO teaching_posts (
  title, 
  description, 
  author, 
  subject, 
  grade_level, 
  files, 
  videos, 
  images, 
  tags,
  likes,
  views
) VALUES 
(
  'Introdução à Automação Industrial',
  'Material completo sobre os fundamentos da automação industrial, incluindo conceitos básicos, tipos de sensores e atuadores, e aplicações práticas na indústria moderna.',
  'Prof. João Silva',
  'Automação Industrial',
  '3º Ano Técnico',
  '[{"name": "Slides_Automacao_Industrial.pdf", "url": "#", "type": "pdf"}, {"name": "Exercicios_Praticos.pdf", "url": "#", "type": "pdf"}]'::jsonb,
  '[{"title": "Sensores na Indústria 4.0", "url": "https://youtube.com/watch?v=example", "platform": "youtube"}]'::jsonb,
  '["https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/159298/gears-cogs-machine-machinery-159298.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
  ARRAY['Automação', 'Sensores', 'Indústria 4.0'],
  24,
  156
),
(
  'Programação de CLPs - Ladder',
  'Aula prática sobre programação de Controladores Lógicos Programáveis utilizando linguagem Ladder. Inclui exemplos práticos e exercícios.',
  'Prof. Maria Santos',
  'Programação Industrial',
  '2º Ano Técnico',
  '[{"name": "Manual_CLP_Ladder.pdf", "url": "#", "type": "pdf"}, {"name": "Exemplos_Programacao.zip", "url": "#", "type": "other"}]'::jsonb,
  '[{"title": "CLP na Prática - Programação Ladder", "url": "https://youtube.com/watch?v=example2", "platform": "youtube"}]'::jsonb,
  '["https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
  ARRAY['CLP', 'Ladder', 'Programação'],
  18,
  89
),
(
  'Internet das Coisas (IoT) na Indústria',
  'Conceitos fundamentais sobre IoT aplicados ao ambiente industrial. Sensores, conectividade e análise de dados em tempo real.',
  'Prof. Carlos Oliveira',
  'Automação Industrial',
  '3º Ano Técnico',
  '[{"name": "IoT_Industrial_Slides.pdf", "url": "#", "type": "pdf"}, {"name": "Projeto_Sensor_Arduino.zip", "url": "#", "type": "other"}]'::jsonb,
  '[{"title": "IoT na Indústria 4.0 - Conceitos Básicos", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "platform": "youtube"}, {"title": "Sensores IoT em Ação", "url": "https://www.youtube.com/watch?v=example3", "platform": "youtube"}]'::jsonb,
  '["https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800", "https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=800"]'::jsonb,
  ARRAY['IoT', 'Sensores', 'Indústria 4.0', 'Arduino'],
  32,
  201
);