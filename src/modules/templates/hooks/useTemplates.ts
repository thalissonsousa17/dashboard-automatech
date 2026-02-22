import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { ExamTemplate } from '../types';
import type { Exam, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function sanitizeForPostgres(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

export const useTemplates = () => {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await db
        .from('exam_templates')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as ExamTemplate[]) || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchTemplates();
  }, [authLoading, fetchTemplates]);

  const createTemplate = async (
    exam: Exam,
    questions: ExamQuestion[],
    name: string,
    description?: string,
  ): Promise<ExamTemplate | null> => {
    if (!user) throw new Error('Usuario nao autenticado');

    const snapshot = questions.map((q) => ({
      id: q.id,
      exam_id: q.exam_id,
      question_number: q.question_number,
      question_type: q.question_type,
      statement: sanitizeForPostgres(q.statement),
      alternatives: q.alternatives.map((alt) => ({
        ...alt,
        text: sanitizeForPostgres(alt.text),
      })),
      correct_answer: q.correct_answer,
      explanation: q.explanation
        ? sanitizeForPostgres(q.explanation)
        : null,
      created_at: q.created_at,
      updated_at: q.updated_at,
    }));

    const { data, error } = await db
      .from('exam_templates')
      .insert({
        name: sanitizeForPostgres(name),
        description: description ? sanitizeForPostgres(description) : null,
        source_exam_id: exam.id,
        subject: sanitizeForPostgres(exam.subject),
        question_type: exam.question_type,
        difficulty: exam.difficulty,
        question_count: exam.question_count,
        mixed_mc_count: exam.mixed_mc_count,
        mixed_essay_count: exam.mixed_essay_count,
        reference_material: exam.reference_material
          ? sanitizeForPostgres(exam.reference_material)
          : null,
        questions_snapshot: snapshot,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const template = data as ExamTemplate;
    setTemplates((prev) => [template, ...prev]);
    return template;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await db
      .from('exam_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const createExamFromTemplate = async (
    templateId: string,
    workspaceId?: string | null,
    folderId?: string | null,
  ): Promise<{ exam: Exam; questions: ExamQuestion[] } | null> => {
    if (!user) throw new Error('Usuario nao autenticado');

    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error('Template nao encontrado');

    // Create new exam from template
    const examInsert: Record<string, unknown> = {
      title: `${template.name} (copia)`,
      subject: template.subject,
      question_count: template.question_count,
      question_type: template.question_type,
      difficulty: template.difficulty,
      reference_material: template.reference_material,
      mixed_mc_count: template.mixed_mc_count,
      mixed_essay_count: template.mixed_essay_count,
      status: 'generated',
      created_by: user.id,
    };

    if (workspaceId) examInsert.workspace_id = workspaceId;
    if (folderId) examInsert.folder_id = folderId;

    const { data: examData, error: examError } = await db
      .from('exams')
      .insert(examInsert)
      .select()
      .single();

    if (examError) throw examError;
    const newExam = examData as Exam;

    // Insert questions from snapshot
    const questionsToInsert = template.questions_snapshot.map((q, idx) => ({
      exam_id: newExam.id,
      question_number: idx + 1,
      question_type: q.question_type,
      statement: q.statement,
      alternatives: q.alternatives,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }));

    const { data: qData, error: qError } = await db
      .from('exam_questions')
      .insert(questionsToInsert)
      .select();

    if (qError) throw qError;

    return {
      exam: newExam,
      questions: (qData as ExamQuestion[]) || [],
    };
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    createExamFromTemplate,
  };
};
