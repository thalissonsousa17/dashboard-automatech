-- Criar tabela para submissões de estudantes
CREATE TABLE IF NOT EXISTS public.student_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.submission_folders(id) ON DELETE CASCADE,
  student_registration TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_evaluation JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view submissions for their folders" 
ON public.student_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.submission_folders 
    WHERE id = student_submissions.folder_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can create submissions via share link" 
ON public.student_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update submissions for their folders" 
ON public.student_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.submission_folders 
    WHERE id = student_submissions.folder_id 
    AND created_by = auth.uid()
  )
);

-- Criar trigger para updated_at
CREATE TRIGGER update_student_submissions_updated_at
BEFORE UPDATE ON public.student_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();