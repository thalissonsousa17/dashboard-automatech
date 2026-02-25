import React, { useState, useEffect } from 'react';
import { FileDown, Layers } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  exportExamToPdf,
  exportVersionToPdf,
  exportAllVersionsAsPdf,
} from '../../shared/utils/examExport';
import type { Exam, ExamQuestion, ExamVersion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface DrawerTabVersionsProps {
  examId: string;
  exam: Exam;
  questions: ExamQuestion[];
}

const DrawerTabVersions: React.FC<DrawerTabVersionsProps> = ({
  examId,
  exam,
  questions,
}) => {
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

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

  const handleDownloadOriginal = async () => {
    setExportingId('original');
    try {
      await exportExamToPdf(examId);
    } catch (err) {
      console.error('Erro ao exportar original:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setExportingId('all');
    try {
      await exportAllVersionsAsPdf(exam, questions, versions);
    } catch (err) {
      console.error('Erro ao exportar tudo:', err);
    } finally {
      setTimeout(() => setExportingId(null), 800);
    }
  };

  const handleDownloadVersion = (version: ExamVersion) => {
    setExportingId(version.id);
    try {
      exportVersionToPdf(exam, version, questions);
    } catch (err) {
      console.error('Erro ao exportar versao:', err);
    } finally {
      // small delay so user sees the "Gerando..." feedback
      setTimeout(() => setExportingId(null), 800);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {versions.length} {versions.length === 1 ? 'versao' : 'versoes'} disponivel(eis)
        </p>
        {versions.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={exportingId === 'all'}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{exportingId === 'all' ? 'Gerando...' : 'Baixar Todas as Provas'}</span>
          </button>
        )}
      </div>

      {/* ── Prova Original ──────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">ORI</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Prova Original</h4>
            <p className="text-xs text-gray-500">Questões na ordem gerada pela IA</p>
          </div>
        </div>
        <button
          onClick={handleDownloadOriginal}
          disabled={exportingId === 'original'}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>{exportingId === 'original' ? 'Gerando...' : 'PDF'}</span>
        </button>
      </div>

      {/* ── Versões embaralhadas ─────────────────────────────── */}
      {versions.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma versão embaralhada gerada.</p>
          <p className="text-xs mt-1">
            Finalize a prova no Gerador de Provas IA para criar versões.
          </p>
        </div>
      ) : (
        versions.map((version) => (
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
                  Versão {version.version_label}
                </h4>
                <p className="text-xs text-gray-500">
                  {new Date(version.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDownloadVersion(version)}
              disabled={exportingId === version.id}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{exportingId === version.id ? 'Gerando...' : 'PDF'}</span>
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default DrawerTabVersions;
