import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ExamAnswerKey, ExamVersion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DrawerTabAnswerKeyProps {
  examId: string;
}

const DrawerTabAnswerKey: React.FC<DrawerTabAnswerKeyProps> = ({ examId }) => {
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [answerKeys, setAnswerKeys] = useState<ExamAnswerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

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

        if (v.length > 0) {
          setSelectedVersion(v[0].id);
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
        Nenhuma versao gerada. Finalize a prova para gerar o gabarito.
      </div>
    );
  }

  const currentKey = answerKeys.find((ak) => ak.version_id === selectedVersion);
  const currentVersion = versions.find((v) => v.id === selectedVersion);

  return (
    <div>
      {/* Version Tabs */}
      <div className="flex space-x-1 mb-4 overflow-x-auto">
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
            Versao {v.version_label}
          </button>
        ))}
      </div>

      {/* Answer Key Grid */}
      {currentKey && currentVersion && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Gabarito - Versao {currentVersion.version_label}
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(currentKey.answers)
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
                    {answer}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawerTabAnswerKey;
