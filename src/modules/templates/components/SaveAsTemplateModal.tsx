import React, { useState, useEffect } from 'react';
import { X, BookmarkPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTemplates } from '../hooks/useTemplates';
import type { Exam, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
}

const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const { createTemplate } = useTemplates();
  const [name, setName] = useState(`Template - ${exam.title}`);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && exam) {
      setName(`Template - ${exam.title}`);
      setSuccess(false);
      loadQuestions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exam]);

  const loadQuestions = async () => {
    setLoadingQ(true);
    try {
      const { data, error } = await db
        .from('exam_questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('question_number', { ascending: true });
      if (error) throw error;
      setQuestions((data as ExamQuestion[]) || []);
    } catch (err) {
      console.error('Erro ao carregar questoes:', err);
    } finally {
      setLoadingQ(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await createTemplate(exam, questions, name.trim(), description.trim());
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BookmarkPlus className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Salvar como Template
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {success ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookmarkPlus className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">Template salvo com sucesso!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {loadingQ ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  {questions.length} questoes serao salvas neste template
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descricao
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descricao opcional do template..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || loadingQ || !name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Template'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default SaveAsTemplateModal;
