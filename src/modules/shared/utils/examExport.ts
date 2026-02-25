import { supabase } from '../../../lib/supabase';
import type { Exam, ExamQuestion, ExamVersion, ExamAnswerKey } from '../../../types';

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

// ---------------------------------------------------------------------------
// EXPORT DE VERSÃO ESPECÍFICA
// ---------------------------------------------------------------------------

/** Reordena questões e alternativas de acordo com o shuffling da versão */
export function buildVersionQuestions(
  version: ExamVersion,
  originalQuestions: ExamQuestion[],
): ExamQuestion[] {
  const order = version.question_order as number[];
  return order.map((originalIndex, newIndex) => {
    const q = originalQuestions[originalIndex];
    if (!q) return null as unknown as ExamQuestion;
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
}

/** Exporta uma versão específica (questões embaralhadas) como PDF via impressão */
export function exportVersionToPdf(
  exam: Exam,
  version: ExamVersion,
  originalQuestions: ExamQuestion[],
): void {
  const vQuestions = buildVersionQuestions(version, originalQuestions);
  const bodyHtml = buildQuestionsHtml(vQuestions);

  const difficultyLabel: Record<string, string> = {
    easy: 'Fácil', medium: 'Médio', hard: 'Difícil',
  };
  const meta = [
    exam.subject,
    `Versão ${version.version_label}`,
    exam.difficulty ? difficultyLabel[exam.difficulty] ?? exam.difficulty : null,
  ].filter(Boolean).join(' • ');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${exam.title} - Versão ${version.version_label}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 40px 32px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    .meta { color: #555; font-size: 12px; margin-bottom: 10px; }
    .fields { display: flex; gap: 24px; font-size: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #ddd; }
    @media print { body { padding: 20px; } button { display: none !important; } }
  </style>
</head>
<body>
  <h1>${exam.title}</h1>
  <div class="meta">${meta}</div>
  <div class="fields">
    <span>Nome: ___________________________________________</span>
    <span>Data: ___/___/______</span>
  </div>
  <div class="fields">
    <span>Turma: ____________________</span>
    <span>Matrícula: ____________________</span>
  </div>
  ${bodyHtml}
</body>
</html>`;

  openPrintWindow(html);
}

// ---------------------------------------------------------------------------
// EXPORT DE GABARITO
// ---------------------------------------------------------------------------

/** Exporta o gabarito de uma versão como PDF via impressão */
export function exportAnswerKeyToPdf(
  exam: Exam,
  version: ExamVersion,
  answerKey: ExamAnswerKey,
): void {
  const entries = Object.entries(answerKey.answers).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  const rows = entries.map(([num, answer]) => `
    <div class="row">
      <span class="num">Q${num}</span>
      <span class="ans ${answer === 'Dissertativa' ? 'essay' : ''}">${answer}</span>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Gabarito - ${exam.title} - Versão ${version.version_label}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; max-width: 700px; margin: 0 auto; padding: 40px 32px; }
    h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
    .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 6px; }
    .conf { text-align: center; font-size: 11px; color: #e00; margin-bottom: 16px; }
    hr { border: none; border-top: 2px solid #ddd; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; border-radius: 6px; padding: 6px 10px; }
    .num { font-size: 11px; color: #888; }
    .ans { font-weight: bold; font-size: 15px; color: #16a34a; }
    .essay { color: #ea580c; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>GABARITO OFICIAL</h1>
  <div class="sub">${exam.title} — Versão ${version.version_label}</div>
  <div class="conf">DOCUMENTO CONFIDENCIAL — USO EXCLUSIVO DO PROFESSOR</div>
  <hr/>
  <div class="grid">${rows}</div>
</body>
</html>`;

  openPrintWindow(html);
}

/** Exporta os gabaritos de TODAS as versões em um único PDF */
export function exportAllAnswerKeysToPdf(
  exam: Exam,
  versions: ExamVersion[],
  answerKeys: ExamAnswerKey[],
): void {
  const sections = versions.map((v) => {
    const ak = answerKeys.find((k) => k.version_id === v.id);
    if (!ak) return `<div class="version-block"><h2>Versão ${v.version_label}</h2><p class="empty">Gabarito não disponível.</p></div>`;

    const entries = Object.entries(ak.answers).sort(([a], [b]) => Number(a) - Number(b));
    const rows = entries.map(([num, answer]) => `
      <div class="row">
        <span class="num">Q${num}</span>
        <span class="ans ${answer === 'Dissertativa' ? 'essay' : ''}">${answer}</span>
      </div>`).join('');

    return `
      <div class="version-block">
        <h2>Versão ${v.version_label}</h2>
        <div class="grid">${rows}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Gabaritos - ${exam.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; max-width: 700px; margin: 0 auto; padding: 40px 32px; }
    h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
    .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 6px; }
    .conf { text-align: center; font-size: 11px; color: #e00; margin-bottom: 16px; }
    hr { border: none; border-top: 2px solid #ddd; margin-bottom: 20px; }
    .version-block { margin-bottom: 28px; page-break-inside: avoid; }
    .version-block h2 { font-size: 14px; font-weight: 700; color: #1d4ed8; border-left: 4px solid #1d4ed8; padding-left: 10px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .row { display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; border-radius: 5px; padding: 5px 8px; }
    .num { font-size: 11px; color: #888; }
    .ans { font-weight: bold; font-size: 14px; color: #16a34a; }
    .essay { color: #ea580c; }
    .empty { font-size: 12px; color: #999; font-style: italic; }
    @media print { body { padding: 20px; } .version-block { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>GABARITOS OFICIAIS</h1>
  <div class="sub">${exam.title}</div>
  <div class="conf">DOCUMENTO CONFIDENCIAL — USO EXCLUSIVO DO PROFESSOR</div>
  <hr/>
  ${sections}
</body>
</html>`;

  openPrintWindow(html);
}

/** Exporta o gabarito original (IA) como PDF via impressão */
export function exportOriginalAnswerKeyToPdf(
  exam: Exam,
  questions: ExamQuestion[],
): void {
  const rows = questions.map((q) => {
    const answer = q.question_type === 'essay' ? 'Dissertativa' : (q.correct_answer || '-');
    return `
      <div class="row">
        <span class="num">Q${q.question_number}</span>
        <span class="ans ${answer === 'Dissertativa' ? 'essay' : ''}">${answer}</span>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Gabarito Original - ${exam.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; max-width: 700px; margin: 0 auto; padding: 40px 32px; }
    h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
    .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 6px; }
    .conf { text-align: center; font-size: 11px; color: #e00; margin-bottom: 16px; }
    hr { border: none; border-top: 2px solid #ddd; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; border-radius: 6px; padding: 6px 10px; }
    .num { font-size: 11px; color: #888; }
    .ans { font-weight: bold; font-size: 15px; color: #16a34a; }
    .essay { color: #ea580c; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>GABARITO OFICIAL — ORIGINAL</h1>
  <div class="sub">${exam.title} — Questões IA</div>
  <div class="conf">DOCUMENTO CONFIDENCIAL — USO EXCLUSIVO DO PROFESSOR</div>
  <hr/>
  <div class="grid">${rows}</div>
</body>
</html>`;

  openPrintWindow(html);
}

/** Exporta a prova original e todas as suas versões em um único PDF */
export async function exportAllVersionsAsPdf(
  exam: Exam,
  questions: ExamQuestion[],
  versions: ExamVersion[],
): Promise<void> {
  const difficultyLabel: Record<string, string> = {
    easy: 'Fácil', medium: 'Médio', hard: 'Difícil',
  };

  const getMeta = (label: string) => [
    exam.subject,
    label,
    exam.difficulty ? difficultyLabel[exam.difficulty] ?? exam.difficulty : null,
  ].filter(Boolean).join(' • ');

  // 1. Bloco Prova Original
  const originalHtml = buildQuestionsHtml(questions);
  let fullContent = `
    <div class="page-break">
      <h1>${exam.title}</h1>
      <div class="meta">${getMeta('Original')}</div>
      <div class="fields">
        <span>Nome: ___________________________________________</span>
        <span>Data: ___/___/______</span>
      </div>
      <div class="fields">
        <span>Turma: ____________________</span>
        <span>Matrícula: ____________________</span>
      </div>
      ${originalHtml}
    </div>`;

  // 2. Blocos das Versões
  versions.forEach((v) => {
    const vQuestions = buildVersionQuestions(v, questions);
    const vHtml = buildQuestionsHtml(vQuestions);
    fullContent += `
      <div class="page-break">
        <h1>${exam.title}</h1>
        <div class="meta">${getMeta(`Versão ${v.version_label}`)}</div>
        <div class="fields">
          <span>Nome: ___________________________________________</span>
          <span>Data: ___/___/______</span>
        </div>
        <div class="fields">
          <span>Turma: ____________________</span>
          <span>Matrícula: ____________________</span>
        </div>
        ${vHtml}
      </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${exam.title} - Coleção Completa</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 0; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    .meta { color: #555; font-size: 12px; margin-bottom: 10px; }
    .fields { display: flex; gap: 24px; font-size: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #ddd; }
    .page-break { padding: 40px 32px; page-break-after: always; }
    .page-break:last-child { page-break-after: auto; }
    @media print { 
      .page-break { padding: 20px; }
      button { display: none !important; } 
    }
  </style>
</head>
<body>
  ${fullContent}
</body>
</html>`;

  openPrintWindow(html);
}
