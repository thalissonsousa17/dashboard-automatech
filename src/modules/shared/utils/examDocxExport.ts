import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Exam, ExamQuestion, ExamVersion } from '../../../types';

const MARKER_REGEX = /\{\{[Qq][Uu][Ee][Ss][Tt][OoÕõ][Ee][Ss]\}\}/;
const PARAGRAPH_WITH_MARKER =
  /<w:p\b[^>]*>(?:(?!<w:p\b).)*?\{\{[Qq][Uu][Ee][Ss][Tt][OoÕõ][Ee][Ss]\}\}(?:(?!<w:p\b).)*?<\/w:p>/s;

// ---------------------------------------------------------------------------
// BUILD HELPERS
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildQuestionsXML(questions: ExamQuestion[]): string {
  let xml = '';
  for (const q of questions) {
    xml += `<w:p>
      <w:pPr><w:spacing w:before="200"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(String(q.question_number))}. </w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(q.statement)}</w:t></w:r>
    </w:p>`;

    if (q.question_type === 'multiple_choice') {
      for (const alt of q.alternatives) {
        xml += `<w:p>
          <w:pPr><w:ind w:left="360"/><w:spacing w:before="60"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">    (${escapeXml(alt.letter)}) ${escapeXml(alt.text)}</w:t></w:r>
        </w:p>`;
      }
    } else {
      for (let i = 0; i < 4; i++) {
        xml += `<w:p>
          <w:pPr><w:spacing w:before="100"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="22"/><w:color w:val="CCCCCC"/></w:rPr><w:t>___________________________________________</w:t></w:r>
        </w:p>`;
      }
    }
  }
  return xml;
}

function replaceParagraphByTextContent(
  docXml: string,
  markerRegex: RegExp,
  replacement: string,
): string | null {
  const pRegex = /(<w:p\b[^>]*>[\s\S]*?<\/w:p>)/g;
  let found = false;

  const result = docXml.replace(pRegex, (paragraph) => {
    if (found) return paragraph;
    const textNodes = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
    const paragraphText = textNodes.map((m) => m[1]).join('');
    if (markerRegex.test(paragraphText)) {
      found = true;
      return replacement;
    }
    return paragraph;
  });

  return found ? result : null;
}

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

/** Gera DOCX a partir de texto plano como template. */
export async function buildDocxFromText(
  templateText: string,
  questions: ExamQuestion[],
  title: string,
): Promise<Blob> {
  const parts = templateText.split(MARKER_REGEX);
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

/** Injeta questões em um DOCX/DOC existente via ZIP.
 *  Tenta abrir como ZIP primeiro (.docx e .doc modernos funcionam).
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
    // Não é ZIP — arquivo .doc binário antigo (OLE). Usa mammoth.
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return buildDocxFromText(
      result.value || '',
      questions,
      templateFile.name.replace(/\.[^.]+$/i, ''),
    );
  }

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('DOCX inválido: word/document.xml não encontrado.');

  let docXml = await docXmlFile.async('string');
  const questionsXml = buildQuestionsXML(questions);

  if (PARAGRAPH_WITH_MARKER.test(docXml)) {
    docXml = docXml.replace(PARAGRAPH_WITH_MARKER, questionsXml);
  } else if (MARKER_REGEX.test(docXml)) {
    docXml = docXml.replace(MARKER_REGEX, questionsXml);
  } else {
    const resultWithMarker = replaceParagraphByTextContent(docXml, MARKER_REGEX, questionsXml);
    if (resultWithMarker) {
      docXml = resultWithMarker;
    } else {
      // Sem marcador: insere antes de <w:sectPr ou </w:body>
      const sectPrIdx = docXml.lastIndexOf('<w:sectPr');
      const bodyEndIdx = docXml.lastIndexOf('</w:body>');
      const insertAt =
        sectPrIdx > -1 && sectPrIdx < bodyEndIdx ? sectPrIdx : bodyEndIdx;

      const separator = `<w:p><w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="20"/></w:rPr><w:t>${'─'.repeat(50)}</w:t></w:r></w:p>`;
      docXml = docXml.slice(0, insertAt) + separator + questionsXml + docXml.slice(insertAt);
    }
  }

  zip.file('word/document.xml', docXml);
  return zip.generateAsync({ type: 'blob' });
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
