import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Layers, Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { extractPdfTextPreserveLines } from '../../../lib/pdfExtract';
import {
  exportExamToPdf,
  exportVersionToPdf,
  exportAllVersionsAsPdf,
  exportAnswerSheetToPdf,
} from '../../shared/utils/examExport';
import {
  exportOriginalDOCX,
  exportVersionDOCX,
} from '../../shared/utils/examDocxExport';
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

  // Template de prova
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState<string | null>(null);
  const [extractingTemplate, setExtractingTemplate] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

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

  const handleTemplateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['docx', 'doc', 'pdf'].includes(ext || '')) {
      alert('Formato não suportado. Use DOCX, DOC ou PDF.');
      return;
    }
    if (templateInputRef.current) templateInputRef.current.value = '';

    if (ext === 'pdf') {
      // PDF → extrai texto com pdfjs → buildDocxFromText
      setExtractingTemplate(true);
      setTemplateFile(file);
      setTemplateText(null);
      try {
        const text = await extractPdfTextPreserveLines(file);
        setTemplateText(text);
      } catch {
        alert('Não foi possível extrair o texto do PDF.');
        setTemplateFile(null);
        setTemplateText(null);
      } finally {
        setExtractingTemplate(false);
      }
    } else if (ext === 'doc') {
      // .doc binário OLE: extrai texto via Edge Function (formatação não é preservada)
      const ok = window.confirm(
        'Arquivos .doc antigos perdem a formatação (tabelas, imagens, estilos).\n\n' +
        'Para preservar 100% da formatação, abra o arquivo no Word e salve como .docx.\n\n' +
        'Deseja continuar mesmo assim?'
      );
      if (!ok) return;
      setExtractingTemplate(true);
      setTemplateFile(file);
      setTemplateText(null);
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${supabaseUrl}/functions/v1/convert-doc`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${supabaseKey}` },
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Falha na conversão');
        setTemplateText(json.text || '');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[convert-doc]', err);
        alert(`Não foi possível ler o arquivo .doc: ${msg}`);
        setTemplateFile(null);
        setTemplateText(null);
      } finally {
        setExtractingTemplate(false);
      }
    } else {
      // .docx → injeta direto no ZIP na hora do download
      setTemplateFile(file);
      setTemplateText(null);
    }
  };

  const handleDownloadOriginalPDF = async () => {
    setExportingId('original-pdf');
    try {
      await exportExamToPdf(examId);
    } catch (err) {
      console.error('Erro ao exportar original PDF:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadOriginalDOCX = async () => {
    setExportingId('original-docx');
    try {
      await exportOriginalDOCX(questions, exam, templateFile, templateText);
    } catch (err) {
      console.error('Erro ao exportar original DOCX:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadOriginalSheet = () => {
    exportAnswerSheetToPdf(exam, questions);
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

  const handleDownloadVersionPDF = (version: ExamVersion) => {
    setExportingId(version.id + '-pdf');
    try {
      exportVersionToPdf(exam, version, questions);
    } catch (err) {
      console.error('Erro ao exportar versao PDF:', err);
    } finally {
      setTimeout(() => setExportingId(null), 800);
    }
  };

  const handleDownloadVersionDOCX = async (version: ExamVersion) => {
    setExportingId(version.id + '-docx');
    try {
      await exportVersionDOCX(version, questions, exam, templateFile, templateText);
    } catch (err) {
      console.error('Erro ao exportar versao DOCX:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadVersionSheet = (version: ExamVersion) => {
    const vQuestions = (() => {
      const order = version.question_order as number[];
      return order.map((originalIndex, newIndex) => {
        const q = questions[originalIndex];
        if (!q) return null;
        if (q.question_type === 'multiple_choice' && version.alternatives_order[String(newIndex + 1)]) {
          const altOrder = version.alternatives_order[String(newIndex + 1)] as string[];
          const reorderedAlts = altOrder
            .map((letter) => q.alternatives?.find((a) => a.letter === letter))
            .filter(Boolean)
            .map((a, i) => ({ letter: ['A', 'B', 'C', 'D', 'E'][i], text: a!.text }));
          return { ...q, question_number: newIndex + 1, alternatives: reorderedAlts };
        }
        return { ...q, question_number: newIndex + 1 };
      }).filter(Boolean);
    })() as ExamQuestion[];
    exportAnswerSheetToPdf(exam, vQuestions, version);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Modelo de Prova ─────────────────────────────────── */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs font-semibold text-purple-700 mb-1">Modelo de Prova (opcional)</p>
        <p className="text-xs text-purple-500 mb-2">
          Anexe um modelo para aplicar ao DOCX. Use{' '}
          <code className="bg-purple-100 px-1 rounded">{'{{QUESTOES}}'}</code> como marcador.
        </p>
        <input
          ref={templateInputRef}
          type="file"
          accept=".docx,.doc,.pdf"
          className="hidden"
          onChange={handleTemplateChange}
        />
        {templateFile ? (
          <div className="flex items-center justify-between bg-white border border-purple-200 rounded px-2 py-1.5 text-xs text-purple-700">
            <div className="flex items-center gap-1.5 truncate">
              {extractingTemplate
                ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
                : <FileText className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate max-w-[180px]">
                {extractingTemplate ? 'Lendo PDF...' : templateFile.name}
              </span>
            </div>
            <button
              onClick={() => { setTemplateFile(null); setTemplateText(null); }}
              className="ml-2 text-purple-400 hover:text-red-500 font-bold flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            className="w-full px-2 py-1.5 border border-dashed border-purple-300 rounded text-xs text-purple-600 hover:bg-purple-100 flex items-center justify-center gap-1"
          >
            <Upload className="w-3 h-3" />
            Selecionar modelo (DOCX, DOC ou PDF)
          </button>
        )}
      </div>

      {/* ── Cabeçalho ─────────────────────────────────────── */}
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
            <span>{exportingId === 'all' ? 'Gerando...' : 'Baixar Todas (PDF)'}</span>
          </button>
        )}
      </div>

      {/* ── Prova Original ──────────────────────────────────── */}
      <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-600">ORI</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Prova Original</h4>
              <p className="text-xs text-gray-500">Questões na ordem gerada pela IA</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 ml-12">
          <button
            onClick={handleDownloadOriginalPDF}
            disabled={exportingId === 'original-pdf'}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingId === 'original-pdf' ? 'Gerando...' : 'PDF'}</span>
          </button>
          <button
            onClick={handleDownloadOriginalDOCX}
            disabled={exportingId === 'original-docx' || extractingTemplate}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingId === 'original-docx' ? 'Gerando...' : templateFile ? 'DOCX (modelo)' : 'DOCX'}</span>
          </button>
          <button
            onClick={handleDownloadOriginalSheet}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Folha de Respostas</span>
          </button>
        </div>
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
            className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-purple-600">{version.version_label}</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Versão {version.version_label}</h4>
                <p className="text-xs text-gray-500">
                  {new Date(version.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-12">
              <button
                onClick={() => handleDownloadVersionPDF(version)}
                disabled={exportingId === version.id + '-pdf'}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{exportingId === version.id + '-pdf' ? 'Gerando...' : 'PDF'}</span>
              </button>
              <button
                onClick={() => handleDownloadVersionDOCX(version)}
                disabled={exportingId === version.id + '-docx' || extractingTemplate}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{exportingId === version.id + '-docx' ? 'Gerando...' : templateFile ? 'DOCX (modelo)' : 'DOCX'}</span>
              </button>
              <button
                onClick={() => handleDownloadVersionSheet(version)}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Folha de Respostas</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DrawerTabVersions;
