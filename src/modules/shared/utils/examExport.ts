import { supabase } from '../../../lib/supabase';
import type { Exam, ExamQuestion } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Exporta a prova como PDF via janela de impressão do navegador.
 * Regra: se existir conteúdo editado no Tiptap → usa o HTML editado.
 *        caso contrário → constrói HTML a partir das questões geradas pela IA.
 */
export async function exportExamToPdf(examId: string): Promise<void> {
  // 1. Buscar dados da prova
  const { data: examData, error: examError } = await db
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();

  if (examError) throw examError;
  const exam = examData as Exam;

  // 2. Verificar se existe conteúdo editado no Tiptap
  const { data: editedContent } = await db
    .from('exam_edited_content')
    .select('content_html')
    .eq('exam_id', examId)
    .maybeSingle();

  let bodyHtml: string;

  if (editedContent?.content_html) {
    // Usa versão editada
    bodyHtml = editedContent.content_html;
  } else {
    // Usa versão original gerada pela IA
    const { data: questionsData } = await db
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number', { ascending: true });

    const questions = (questionsData as ExamQuestion[]) || [];
    bodyHtml = buildQuestionsHtml(questions);
  }

  const fullHtml = buildPrintableHtml(exam, bodyHtml);
  openPrintWindow(fullHtml);
}

// ---------------------------------------------------------------------------

function buildQuestionsHtml(questions: ExamQuestion[]): string {
  return questions
    .map((q) => {
      let html = `
        <div style="margin-bottom: 28px; page-break-inside: avoid;">
          <p style="font-weight: 600; margin: 0 0 10px 0; line-height: 1.5;">
            ${q.question_number}. ${q.statement}
          </p>`;

      if (q.question_type === 'multiple_choice' && q.alternatives?.length) {
        html += '<div style="margin-left: 20px;">';
        q.alternatives.forEach((alt) => {
          html += `<p style="margin: 5px 0;">${alt.letter}) ${alt.text}</p>`;
        });
        html += '</div>';
      }

      html += '</div>';
      return html;
    })
    .join('');
}

function buildPrintableHtml(exam: Exam, bodyHtml: string): string {
  const difficultyLabel: Record<string, string> = {
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
  };

  const meta = [
    exam.subject,
    exam.difficulty ? difficultyLabel[exam.difficulty] ?? exam.difficulty : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${exam.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #111;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 32px;
    }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    .meta {
      color: #555;
      font-size: 12px;
      margin-bottom: 28px;
      padding-bottom: 14px;
      border-bottom: 2px solid #ddd;
    }
    @media print {
      body { padding: 20px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>${exam.title}</h1>
  <div class="meta">${meta}</div>
  ${bodyHtml}
</body>
</html>`;
}

function openPrintWindow(html: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    // eslint-disable-next-line no-alert
    alert('Popup bloqueado. Permita popups para exportar o PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Pequeno delay para garantir que o conteúdo carregou antes de imprimir
  setTimeout(() => win.print(), 600);
}
