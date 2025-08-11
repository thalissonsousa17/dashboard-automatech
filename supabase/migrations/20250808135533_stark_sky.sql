/*
  # Criar bucket no Supabase Storage para arquivos de posts

  1. Storage Bucket
    - Criar bucket `teaching-posts-files` para arquivos dos posts
    - Configurar políticas de acesso público para leitura
    - Permitir upload apenas para usuários autenticados

  2. Políticas de Segurança
    - Leitura pública dos arquivos
    - Upload restrito a usuários autenticados
    - Delete restrito ao proprietário do arquivo

  3. Integração
    - Bucket integrado com coluna `images` da tabela `teaching_posts`
    - URLs dos arquivos armazenados na coluna para download
*/

-- Criar bucket para arquivos dos posts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teaching-posts-files',
  'teaching-posts-files',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-rar-compressed'
  ]
);

-- Política para permitir leitura pública dos arquivos
CREATE POLICY "Public read access for teaching posts files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'teaching-posts-files');

-- Política para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload teaching posts files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'teaching-posts-files');

-- Política para permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Users can delete their own teaching posts files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'teaching-posts-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Users can update their own teaching posts files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teaching-posts-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);