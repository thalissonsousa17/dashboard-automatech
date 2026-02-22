import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { ExamEditedContent } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useExamEditor = () => {
  const { user } = useAuth();
  const [editedContent, setEditedContent] = useState<ExamEditedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContent = useCallback(async (examId: string) => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('exam_edited_content')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle();

      if (error) throw error;
      setEditedContent(data as ExamEditedContent | null);
    } catch (err) {
      console.error('Erro ao carregar conteudo editado:', err);
      setEditedContent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveContent = async (
    examId: string,
    contentJson: Record<string, unknown>,
    contentHtml: string,
  ) => {
    if (!user) throw new Error('Usuario nao autenticado');
    setSaving(true);

    try {
      if (editedContent) {
        // Update existing
        const { error } = await db
          .from('exam_edited_content')
          .update({
            content_json: contentJson,
            content_html: contentHtml,
            last_edited_by: user.id,
          })
          .eq('id', editedContent.id);

        if (error) throw error;

        setEditedContent({
          ...editedContent,
          content_json: contentJson,
          content_html: contentHtml,
          last_edited_by: user.id,
        });
      } else {
        // Insert new
        const { data, error } = await db
          .from('exam_edited_content')
          .insert({
            exam_id: examId,
            content_json: contentJson,
            content_html: contentHtml,
            last_edited_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setEditedContent(data as ExamEditedContent);
      }
    } catch (err) {
      console.error('Erro ao salvar conteudo:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    editedContent,
    loading,
    saving,
    loadContent,
    saveContent,
  };
};
