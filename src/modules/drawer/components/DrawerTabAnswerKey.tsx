import React, { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  exportAnswerKeyToPdf,
  exportAllAnswerKeysToPdf,
  exportOriginalAnswerKeyToPdf,
} from '../../shared/utils/examExport';
import type { Exam, ExamAnswerKey, ExamVersion, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DrawerTabAnswerKeyProps {
  examId: string;
  exam: Exam;
  questions: ExamQuestion[];
}

const DrawerTabAnswerKey: React.FC<DrawerTabAnswerKeyProps> = ({ examId, exam, questions }) => {
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [answerKeys, setAnswerKeys] = useState<ExamAnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | 'original'>('original');
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: vData } = await db
          .from('exam_versions')
          .select('*')
          .eq('exam_id', examId)
          .order('version_label', { ascending: true });

        const { data: akData } = await db
          .from('exam_answer_keys')
          .select('*')
          .eq('exam_id', examId);

        const v = (vData as ExamVersion[]) || [];
        const ak = (akData as ExamAnswerKey[]) || [];
        setVersions(v);
        setAnswerKeys(ak);

        // Se não houver versões, mantém 'original'
        // Se houver, e o selectedVersion ainda for null (primeira carga), mantém 'original' como padrão
        if (v.length > 0 && selectedVersion === null) {
          setSelectedVersion('original');
        }
      } catch (err) {
        console.error('Erro ao carregar gabarito:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma versão gerada. Finalize a prova para gerar o gabarito.
      </div>
    );
  }

  const isOriginal = selectedVersion === 'original';
  const currentKey = isOriginal ? null : answerKeys.find((ak) => ak.version_id === selectedVersion);
  const currentVersion = isOriginal ? null : versions.find((v) => v.id === selectedVersion);

  const handleDownloadCurrent = () => {
    if (isOriginal) {
      setExportingId('current');
      try {
        exportOriginalAnswerKeyToPdf(exam, questions);
      } finally {
        setTimeout(() => setExportingId(null), 800);
      }
      return;
    }

    if (!currentVersion || !currentKey) return;
    setExportingId('current');
    try {
      exportAnswerKeyToPdf(exam, currentVersion, currentKey);
    } finally {
      setTimeout(() => setExportingId(null), 800);
    }
  };

  const handleDownloadAll = () => {
    setExportingId('all');
    try {
      exportAllAnswerKeysToPdf(exam, versions, answerKeys);
    } finally {
      setTimeout(() => setExportingId(null), 800);
    }
  };

  return (
    <div>
      {/* Version Tabs + download buttons */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex space-x-1 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedVersion('original')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedVersion === 'original'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Original (IA)
          </button>
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVersion(v.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedVersion === v.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Versão {v.version_label}
            </button>
          ))}
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleDownloadCurrent}
            disabled={(!isOriginal && (!currentKey || !currentVersion)) || exportingId === 'current'}
            title={isOriginal ? 'Baixar gabarito original' : `Baixar gabarito da Versão ${currentVersion?.version_label}`}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>
              {exportingId === 'current'
                ? 'Gerando...'
                : isOriginal
                ? 'Original'
                : `Versão ${currentVersion?.version_label}`}
            </span>
          </button>
          <button
            onClick={handleDownloadAll}
            disabled={exportingId === 'all'}
            title="Baixar gabaritos de todas as versões"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingId === 'all' ? 'Gerando...' : 'Todos'}</span>
          </button>
        </div>
      </div>

      {/* Answer Key Grid */}
      {(isOriginal && questions.length > 0) || (currentKey && currentVersion) ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Gabarito — {isOriginal ? 'Original (IA)' : `Versão ${currentVersion?.version_label}`}
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {isOriginal
              ? questions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs font-medium text-gray-500">
                      Q{q.question_number}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        q.question_type === 'essay'
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {q.question_type === 'essay' ? 'Diss.' : q.correct_answer}
                    </span>
                  </div>
                ))
              : Object.entries(currentKey!.answers)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([num, answer]) => (
                    <div
                      key={num}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-xs font-medium text-gray-500">
                        Q{num}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          answer === 'Dissertativa'
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}
                      >
                        {answer === 'Dissertativa' ? 'Diss.' : answer}
                      </span>
                    </div>
                  ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          Gabarito não disponível para esta versão.
        </div>
      )}
    </div>
  );
};

export default DrawerTabAnswerKey;
