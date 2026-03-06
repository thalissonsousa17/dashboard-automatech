import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Exam, ExamQuestion, ExamVersion } from '../../../types';

const MARKER = '{{QUESTOES}}';

// ---------------------------------------------------------------------------
// BUILD HELPERS
// ---------------------------------------------------------------------------

function buildQuestionsParas(questions: ExamQuestion[]): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const q of questions) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${q.question_number}. `, bold: true, size: 24 }),
          new TextRun({ text: q.statement, size: 24 }),
        ],
        spacing: { before: 200 },
      }),
    );
    if (q.question_type === 'multiple_choice') {
      for (const alt of q.alternatives)
        paras.push(
          new Paragraph({
            children: [new TextRun({ text: `    (${alt.letter}) ${alt.text}`, size: 22 })],
            spacing: { before: 60 },
          }),
        );
    } else {
      for (let i = 0; i < 4; i++)
        paras.push(
          new Paragraph({
            children: [new TextRun({ text: '___________________________________________', size: 22, color: 'CCCCCC' })],
            spacing: { before: 100 },
          }),
        );
    }
  }
  return paras;
}

/** Gera DOCX a partir de texto plano (PDF/TXT extraído) como template. */
export async function buildDocxFromText(
  templateText: string,
  questions: ExamQuestion[],
  title: string,
): Promise<Blob> {
  const parts = templateText.split(MARKER);
  const textBefore = parts[0] || '';
  const textAfter = parts.length > 1 ? parts[1] : '';

  const toParagraphs = (text: string) =>
    text
      .split('\n')
      .map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 100 } }));

  const questionParas = buildQuestionsParas(questions);
  const children: Paragraph[] = [
    ...toParagraphs(textBefore || title),
    ...questionParas,
    ...toParagraphs(textAfter),
  ];

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

/** Injeta questões em um DOCX/DOC existente via ZIP. Procura {{QUESTOES}} no XML.
 *  Tenta abrir como ZIP primeiro (.docx e .doc modernos do Word funcionam).
 *  Se falhar (binário OLE antigo), usa mammoth para extrair texto. */
export async function injectQuestionsIntoDocx(
  templateFile: File,
  questions: ExamQuestion[],
): Promise<Blob> {
  const arrayBuffer = await templateFile.arrayBuffer();
  const zip = new JSZip();

  try {
    await zip.loadAsync(arrayBuffer);
  } catch {
    // Não é ZIP — arquivo .doc binário antigo (OLE). Usa mammoth para extrair texto.
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return buildDocxFromText(result.value || '', questions, templateFile.name.replace(/\.[^.]+$/i, ''));
  }

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('DOCX inválido: word/document.xml não encontrado.');

  let xml = await docXmlFile.async('string');
  const hasMarker = xml.includes(MARKER);

  const questionLines: string[] = [];
  for (const q of questions) {
    questionLines.push(`${q.question_number}. ${q.statement}`);
    if (q.question_type === 'multiple_choice') {
      for (const alt of q.alternatives)
        questionLines.push(`    (${alt.letter}) ${alt.text}`);
    }
    questionLines.push('');
  }

  const questionsXml = questionLines
    .map(
      (line) =>
        `<w:p><w:r><w:t xml:space="preserve">${line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</w:t></w:r></w:p>`,
    )
    .join('');

  if (hasMarker) {
    const markerRegex = new RegExp(
      `<w:p[^>]*>(?:(?!<w:p[\\s>]).)*?${MARKER.replace(/{/g, '\\{').replace(/}/g, '\\}')}.*?</w:p>`,
      's',
    );
    xml = xml.replace(markerRegex, questionsXml);
    if (!xml.includes(questionsXml.slice(0, 30))) {
      // fallback simples se regex falhou
      xml = xml.replace(MARKER, questionsXml);
    }
  } else {
    // Sem marcador: insere antes de </w:body>
    const insertPoint = xml.lastIndexOf('</w:body>');
    if (insertPoint !== -1) {
      xml = xml.slice(0, insertPoint) + questionsXml + xml.slice(insertPoint);
    } else {
      xml += questionsXml;
    }
  }

  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/** Gera DOCX padrão (sem template) para uma lista de questões. */
async function buildDefaultDocx(questions: ExamQuestion[], exam: Exam, label: string): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `${exam.title}${label ? ' - ' + label : ''}`,
      heading: HeadingLevel.HEADING_1,
      alignment: 'center' as unknown as undefined,
    }),
    new Paragraph({
      children: [new TextRun({ text: exam.subject, italics: true, size: 22 })],
      alignment: 'center' as unknown as undefined,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Nome: ________________________________  Data: ___/___/______', size: 22 })],
      spacing: { before: 300, after: 300 },
    }),
    ...buildQuestionsParas(questions),
  ];
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

// ---------------------------------------------------------------------------
// PUBLIC EXPORT FUNCTIONS
// ---------------------------------------------------------------------------

/** Reordena questões de uma versão embaralhada. */
export function getVersionQuestions(version: ExamVersion, originalQuestions: ExamQuestion[]): ExamQuestion[] {
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
  }).filter(Boolean) as ExamQuestion[];
}

/** Exporta a prova original como DOCX (com ou sem template). */
export async function exportOriginalDOCX(
  questions: ExamQuestion[],
  exam: Exam,
  templateFile?: File | null,
  templateText?: string | null,
): Promise<void> {
  const title = exam.title;
  let blob: Blob;

  if (templateFile) {
    try {
      if (templateText !== null && templateText !== undefined) {
        blob = await buildDocxFromText(templateText, questions, title);
      } else {
        blob = await injectQuestionsIntoDocx(templateFile, questions);
      }
    } catch {
      alert('Houve um erro ao aplicar o modelo. Baixando DOCX padrão.');
      blob = await buildDefaultDocx(questions, exam, '');
    }
  } else {
    blob = await buildDefaultDocx(questions, exam, '');
  }

  const fileName = templateFile
    ? `${title} - ${templateFile.name.replace(/\.(pdf|txt)$/i, '.docx')}`
    : `${title}.docx`;
  saveAs(blob, fileName);
}

/** Exporta uma versão embaralhada como DOCX (com ou sem template). */
export async function exportVersionDOCX(
  version: ExamVersion,
  originalQuestions: ExamQuestion[],
  exam: Exam,
  templateFile?: File | null,
  templateText?: string | null,
): Promise<void> {
  const vQuestions = getVersionQuestions(version, originalQuestions);
  const label = `Versão ${version.version_label}`;
  const title = `${exam.title} - ${label}`;
  let blob: Blob;

  if (templateFile) {
    try {
      if (templateText !== null && templateText !== undefined) {
        blob = await buildDocxFromText(templateText, vQuestions, title);
      } else {
        blob = await injectQuestionsIntoDocx(templateFile, vQuestions);
      }
    } catch {
      alert('Houve um erro ao aplicar o modelo. Baixando DOCX padrão.');
      blob = await buildDefaultDocx(vQuestions, exam, label);
    }
  } else {
    blob = await buildDefaultDocx(vQuestions, exam, label);
  }

  const fileName = templateFile
    ? `${title} - ${templateFile.name.replace(/\.(pdf|txt)$/i, '.docx')}`
    : `${title}.docx`;
  saveAs(blob, fileName);
}
