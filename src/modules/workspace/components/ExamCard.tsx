import React from 'react';
import { FileText, Clock, BookOpen, MoreHorizontal, ArrowRight, Eye } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Exam } from '../../../types';

interface ExamCardProps {
  exam: Exam;
  onClick: () => void;
  onMove?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  generated: { label: 'Gerada', color: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Revisada', color: 'bg-blue-100 text-blue-700' },
  finalized: { label: 'Finalizada', color: 'bg-green-100 text-green-700' },
};

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facil', color: 'bg-green-50 text-green-700' },
  medium: { label: 'Medio', color: 'bg-orange-50 text-orange-700' },
  hard: { label: 'Dificil', color: 'bg-red-50 text-red-700' },
};

const typeConfig: Record<string, string> = {
  multiple_choice: 'Multipla Escolha',
  essay: 'Dissertativa',
  mixed: 'Mista',
};

const ExamCard: React.FC<ExamCardProps> = ({ exam, onClick, onMove }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const status = statusConfig[exam.status] || statusConfig.draft;
  const difficulty = difficultyConfig[exam.difficulty] || difficultyConfig.medium;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `exam-${exam.id}`, data: { type: 'exam', exam } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 min-w-0">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
            {exam.title}
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((v) => !v);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-7 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onClick();
                    }}
                    className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Abrir
                  </button>
                  {onMove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onMove();
                      }}
                      className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Mover para...
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{exam.subject}</p>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          <BookOpen className="w-3 h-3 mr-1" />
          {exam.question_count} questoes
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${difficulty.color}`}>
          {difficulty.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {typeConfig[exam.question_type] || exam.question_type}
        </span>
      </div>

      <div className="flex items-center mt-3 text-xs text-gray-400">
        <Clock className="w-3 h-3 mr-1" />
        {new Date(exam.created_at).toLocaleDateString('pt-BR')}
      </div>
    </div>
  );
};

export default ExamCard;
