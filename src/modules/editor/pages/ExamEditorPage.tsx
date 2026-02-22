import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Check, AlertCircle,
  Download, ChevronDown, FileText, FileDown, Shuffle,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '../../../lib/supabase';
import { useExamEditor } from '../hooks/useExamEditor';
import ExamEditorView from '../components/ExamEditorView';
import { examQuestionsToTiptapJson } from '../utils/examToTiptap';
import type { Exam, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface ExamVersion {
  id: string;
  version_label: string;
  questions_json: ExamQuestion[];
  created_at: string;
}

// ── Helpers de export ────────────────────────────────────────────────────────

function buildOriginalHtml(exam: Exam, questions: ExamQuestion[]): string {
  const questionsHtml = questions
    .map((q) => {
      let html = `<div style="margin-bottom:24px;page-break-inside:avoid;">
        <p style="font-weight:600;margin:0 0 8px 0;">${q.question_number}. ${q.statement}</p>`;
      if (q.question_type === 'multiple_choice' && q.alternatives?.length) {
        html += '<div style="margin-left:16px;">';
        q.alternatives.forEach((alt) => {
          html += `<p style="margin:4px 0;">${alt.letter}) ${alt.text}</p>`;
        });
        html += '</div>';
      }
      html += '</div>';
      return html;
    })
    .join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>${exam.title}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#111;max-width:800px;margin:0 auto;padding:40px 32px;}
  h1{font-size:20px;margin:0 0 4px 0;}
  .meta{color:#555;font-size:12px;margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid #ddd;}
  @media print{body{padding:20px;}button{display:none!important;}}
</style></head><body>
<h1>${exam.title}</h1>
<div class="meta">${exam.subject ?? ''}</div>
${questionsHtml}
</body></html>`;
}

function buildEditedHtml(exam: Exam, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>${exam.title}</title>
<style>
  body{font-family:Calibri,"Segoe UI",sans-serif;font-size:11pt;line-height:1.6;color:#000;max-width:794px;margin:0 auto;padding:80px 96px;}
  table{border-collapse:collapse;width:100%;}
  td,th{border:1px solid #c0c0c0;padding:6px 10px;}
  img{max-width:100%;height:auto;}
  @media print{body{padding:40px 60px;}button{display:none!important;}}
</style></head><body>
${bodyHtml}
</body></html>`;
}

function openPrintWindow(html: string): void {
  const win = window.open('', '_blank');
  if (!win) { alert('Popup bloqueado. Permita popups para exportar o PDF.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

async function buildDocx(title: string, subject: string | undefined, questions: ExamQuestion[]): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: 'center' as unknown as undefined }),
    new Paragraph({ children: [new TextRun({ text: subject ?? '', italics: true, size: 22 })], alignment: 'center' as unknown as undefined }),
    new Paragraph({ children: [new TextRun({ text: 'Nome: ________________________________  Data: ___/___/______', size: 22 })], spacing: { before: 300, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: 'Turma: __________________  Matrícula: __________________', size: 22 })], spacing: { after: 300 } }),
  ];

  for (const q of questions) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${q.question_number}. `, bold: true, size: 24 }),
        new TextRun({ text: q.statement, size: 24 }),
      ],
      spacing: { before: 200 },
    }));
    if (q.question_type === 'multiple_choice' && q.alternatives?.length) {
      for (const alt of q.alternatives) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `    (${alt.letter}) ${alt.text}`, size: 22 })],
          spacing: { before: 60 },
        }));
      }
    } else {
      for (let i = 0; i < 4; i++) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '___________________________________________', size: 22, color: 'CCCCCC' })],
          spacing: { before: 100 },
        }));
      }
    }
  }

  return Packer.toBlob(new Document({ sections: [{ children }] }));
}

// ── Componente principal ─────────────────────────────────────────────────────

const ExamEditorPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionParam = searchParams.get('version'); // e.g. "A", "B"
  const { editedContent, loading, saving, loadContent, saveContent } = useExamEditor();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [initialEditorContent, setInitialEditorContent] = useState<Record<string, unknown> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const currentJsonRef = useRef<Record<string, unknown> | null>(null);
  const currentHtmlRef = useRef<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Carrega prova + questões + versões
  useEffect(() => {
    const loadData = async () => {
      if (!examId) return;
      setPageLoading(true);
      try {
        const { data: examData, error: examError } = await db.from('exams').select('*').eq('id', examId).single();
        if (examError) throw examError;
        setExam(examData as Exam);

        const { data: questionsData } = await db
          .from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true });
        setQuestions((questionsData as ExamQuestion[]) || []);

        // Versões embaralhadas
        const { data: versionsData } = await db
          .from('exam_versions').select('id, version_label, questions_json, created_at')
          .eq('exam_id', examId).order('created_at', { ascending: true });
        setVersions((versionsData as ExamVersion[]) || []);

        await loadContent(examId);
      } catch (err) {
        console.error('Erro ao carregar prova:', err);
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
  }, [examId, loadContent]);

  // Define conteúdo inicial do editor
  useEffect(() => {
    if (pageLoading || loading) return;
    // If a version param is specified and we have the version with questions_json, use it
    if (versionParam && versions.length > 0) {
      const matchedVersion = versions.find(
        (v) => v.version_label === versionParam,
      );
      if (matchedVersion?.questions_json?.length > 0 && exam) {
        setInitialEditorContent(
          examQuestionsToTiptapJson(
            matchedVersion.questions_json,
            `${exam.title} — Versão ${versionParam}`,
            exam.subject,
          ),
        );
        return;
      }
    }
    if (editedContent?.content_json) {
      setInitialEditorContent(editedContent.content_json);
    } else if (questions.length > 0 && exam) {
      setInitialEditorContent(examQuestionsToTiptapJson(questions, exam.title, exam.subject));
    }
  }, [pageLoading, loading, editedContent, questions, exam, versionParam, versions]);

  const handleEditorUpdate = (json: Record<string, unknown>, html: string) => {
    currentJsonRef.current = json;
    currentHtmlRef.current = html;
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!examId || !currentJsonRef.current) return;
    try {
      await saveContent(examId, currentJsonRef.current, currentHtmlRef.current);
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  };

  // ── Downloads ──────────────────────────────────────────────────────────────

  const handlePdfEdited = useCallback(() => {
    if (!exam) return;
    setShowDownloadMenu(false);
    const html = currentHtmlRef.current || editedContent?.content_html || '';
    if (!html) { alert('Salve o documento antes de exportar o PDF editado.'); return; }
    openPrintWindow(buildEditedHtml(exam, html));
  }, [exam, editedContent]);

  const handlePdfOriginal = useCallback(() => {
    if (!exam) return;
    setShowDownloadMenu(false);
    openPrintWindow(buildOriginalHtml(exam, questions));
  }, [exam, questions]);

  const handleDocxOriginal = useCallback(async () => {
    if (!exam) return;
    setShowDownloadMenu(false);
    setDownloading(true);
    try {
      const blob = await buildDocx(exam.title, exam.subject, questions);
      saveAs(blob, `${exam.title}.docx`);
    } finally {
      setDownloading(false);
    }
  }, [exam, questions]);

  const handleDocxVersion = useCallback(async (version: ExamVersion) => {
    if (!exam) return;
    setShowDownloadMenu(false);
    setDownloading(true);
    try {
      const blob = await buildDocx(
        `${exam.title} - ${version.version_label}`,
        exam.subject,
        version.questions_json,
      );
      saveAs(blob, `${exam.title} - ${version.version_label}.docx`);
    } finally {
      setDownloading(false);
    }
  }, [exam]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pageLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p>Prova não encontrada.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-blue-600 hover:underline">Voltar</button>
      </div>
    );
  }

  const hasEditedContent = !!(editedContent?.content_html || currentHtmlRef.current);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {exam.title}{versionParam ? ` — Versão ${versionParam}` : ''}
            </h1>
            <p className="text-sm text-gray-500 truncate">{exam.subject}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          {/* Status de salvo */}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-sm text-green-600">
              <Check className="w-4 h-4 mr-1" /> Salvo
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" /> Erro ao salvar
            </span>
          )}

          {/* ── Dropdown Baixar ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDownloadMenu((v) => !v)}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Baixando...' : 'Baixar'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {/* Versão editada */}
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Versão Editada</p>
                </div>
                <button
                  onClick={handlePdfEdited}
                  disabled={!hasEditedContent}
                  className="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">PDF — Versão Editada</p>
                    <p className="text-xs text-gray-400">Conteúdo editado no editor</p>
                  </div>
                </button>

                <div className="border-t border-gray-100 mx-2 my-1" />

                {/* Original IA */}
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Original IA</p>
                </div>
                <button
                  onClick={handlePdfOriginal}
                  className="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">PDF — Questões Originais</p>
                    <p className="text-xs text-gray-400">Gerado pela IA</p>
                  </div>
                </button>
                <button
                  onClick={handleDocxOriginal}
                  className="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                >
                  <FileDown className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">DOCX — Questões Originais</p>
                    <p className="text-xs text-gray-400">Arquivo Word (.docx)</p>
                  </div>
                </button>

                {/* Versões embaralhadas */}
                {versions.length > 0 && (
                  <>
                    <div className="border-t border-gray-100 mx-2 my-1" />
                    <div className="px-3 py-1.5">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                        <Shuffle className="w-3 h-3" />
                        <span>Versões Embaralhadas</span>
                      </p>
                    </div>
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleDocxVersion(v)}
                        className="w-full flex items-center space-x-2.5 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                      >
                        <FileDown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-800">DOCX — {v.version_label}</p>
                          <p className="text-xs text-gray-400">Versão embaralhada</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Salvar */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        {initialEditorContent && (
          <ExamEditorView
            initialContent={initialEditorContent}
            onUpdate={handleEditorUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ExamEditorPage;
