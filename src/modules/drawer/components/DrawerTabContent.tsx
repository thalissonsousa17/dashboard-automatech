import React from 'react';
import type { ExamQuestion } from '../../../types';

interface DrawerTabContentProps {
  questions: ExamQuestion[];
}

const DrawerTabContent: React.FC<DrawerTabContentProps> = ({ questions }) => {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma questao gerada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-600">
              Questao {q.question_number}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                q.question_type === 'multiple_choice'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {q.question_type === 'multiple_choice'
                ? 'Multipla Escolha'
                : 'Dissertativa'}
            </span>
          </div>

          <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">
            {q.statement}
          </p>

          {q.question_type === 'multiple_choice' &&
            q.alternatives.length > 0 && (
              <div className="space-y-1.5 ml-2">
                {q.alternatives.map((alt) => (
                  <div
                    key={alt.letter}
                    className={`flex items-start space-x-2 text-sm ${
                      alt.letter === q.correct_answer
                        ? 'text-green-700 font-medium'
                        : 'text-gray-600'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        alt.letter === q.correct_answer
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {alt.letter}
                    </span>
                    <span>{alt.text}</span>
                  </div>
                ))}
              </div>
            )}

          {q.explanation && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>Explicacao:</strong> {q.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DrawerTabContent;
