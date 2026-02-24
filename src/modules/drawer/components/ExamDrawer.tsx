import React, { useState, useEffect } from 'react';
import { Edit3, BookmarkPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SlideDrawer from '../../shared/components/SlideDrawer';
import DrawerTabContent from './DrawerTabContent';
import DrawerTabAnswerKey from './DrawerTabAnswerKey';
import DrawerTabVersions from './DrawerTabVersions';
import { supabase } from '../../../lib/supabase';
import type { Exam, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type TabId = 'content' | 'gabarito' | 'versions';

interface ExamDrawerProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsTemplate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  generated: { label: 'Gerada', color: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', color: 'bg-blue-100 text-blue-700' },
  finalized: { label: 'Finalizada', color: 'bg-green-100 text-green-700' },
};

const ExamDrawer: React.FC<ExamDrawerProps> = ({
  exam,
  isOpen,
  onClose,
  onSaveAsTemplate,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    if (exam && isOpen) {
      setActiveTab('content');
      loadQuestions(exam.id);
    }
  }, [exam, isOpen]);

  const loadQuestions = async (examId: string) => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await db
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number', { ascending: true });

      if (error) throw error;
      setQuestions((data as ExamQuestion[]) || []);
    } catch (err) {
      console.error('Erro ao carregar questoes:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  if (!exam) return null;

  const status = statusConfig[exam.status] || statusConfig.draft;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'content', label: 'Conteudo' },
    { id: 'gabarito', label: 'Gabarito' },
    { id: 'versions', label: 'Versoes' },
  ];

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={exam.title}
      subtitle={exam.subject}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/dashboard/editor/${exam.id}`)}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4" />
              <span>Abrir no Editor</span>
            </button>
            {onSaveAsTemplate && (
              <button
                onClick={onSaveAsTemplate}
                className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Salvar como Template</span>
              </button>
            )}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
            {status.label}
          </span>
        </div>
      }
    >
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {loadingQuestions ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {activeTab === 'content' && (
              <DrawerTabContent questions={questions} />
            )}
            {activeTab === 'gabarito' && (
              <DrawerTabAnswerKey examId={exam.id} exam={exam} />
            )}
            {activeTab === 'versions' && (
              <DrawerTabVersions examId={exam.id} exam={exam} questions={questions} />
            )}
          </>
        )}
      </div>
    </SlideDrawer>
  );
};

export default ExamDrawer;
