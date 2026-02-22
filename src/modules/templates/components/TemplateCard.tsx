import React from 'react';
import { LayoutTemplate, Trash2, BookOpen, Copy } from 'lucide-react';
import type { ExamTemplate } from '../types';

interface TemplateCardProps {
  template: ExamTemplate;
  onUse: () => void;
  onDelete: () => void;
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: 'Facil', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medio', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: 'Dificil', color: 'bg-red-100 text-red-700' },
};

const typeConfig: Record<string, string> = {
  multiple_choice: 'Multipla Escolha',
  essay: 'Dissertativa',
  mixed: 'Mista',
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUse,
  onDelete,
}) => {
  const difficulty = difficultyConfig[template.difficulty] || difficultyConfig.medium;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <LayoutTemplate className="w-5 h-5 text-purple-600" />
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-500 mb-1">{template.subject}</p>

      {template.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {template.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          <BookOpen className="w-3 h-3 mr-1" />
          {template.question_count} questoes
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${difficulty.color}`}>
          {difficulty.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
          {typeConfig[template.question_type] || template.question_type}
        </span>
      </div>

      <button
        onClick={onUse}
        className="flex items-center justify-center w-full space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Usar este Template</span>
      </button>
    </div>
  );
};

export default TemplateCard;
