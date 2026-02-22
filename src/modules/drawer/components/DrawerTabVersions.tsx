import React, { useState, useEffect } from 'react';
import { FileDown, Layers } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { exportExamToPdf } from '../../shared/utils/examExport';
import type { ExamVersion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DrawerTabVersionsProps {
  examId: string;
}

const DrawerTabVersions: React.FC<DrawerTabVersionsProps> = ({ examId }) => {
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportExamToPdf(examId);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const { data, error } = await db
          .from('exam_versions')
          .select('*')
          .eq('exam_id', examId)
          .order('version_label', { ascending: true });

        if (error) throw error;
        setVersions((data as ExamVersion[]) || []);
      } catch (err) {
        console.error('Erro ao carregar versoes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
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
        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Nenhuma versao gerada.</p>
        <p className="text-xs mt-1">
          Finalize a prova no Gerador de Provas IA para criar versoes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {versions.length} {versions.length === 1 ? 'versao' : 'versoes'} disponivel(eis)
      </p>

      {versions.map((version) => (
        <div
          key={version.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-purple-600">
                {version.version_label}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Versao {version.version_label}
              </h4>
              <p className="text-xs text-gray-500">
                {new Date(version.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exporting ? 'Gerando...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DrawerTabVersions;
