import type { ExamQuestion } from '../../../types';

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export function examQuestionsToTiptapJson(
  questions: ExamQuestion[],
  examTitle?: string,
  examSubject?: string,
): Record<string, unknown> {
  const content: TiptapNode[] = [];

  // Title
  if (examTitle) {
    content.push({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: examTitle }],
    });
  }

  // Subject
  if (examSubject) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `Disciplina: ${examSubject}`,
          marks: [{ type: 'italic' }],
        },
      ],
    });
  }

  // Separator
  content.push({ type: 'horizontalRule' });

  // Questions
  questions.forEach((q) => {
    // Question header
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [
        {
          type: 'text',
          text: `Questao ${q.question_number}`,
          marks: [{ type: 'bold' }],
        },
        {
          type: 'text',
          text: q.question_type === 'multiple_choice'
            ? ' (Multipla Escolha)'
            : ' (Dissertativa)',
        },
      ],
    });

    // Statement
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: q.statement }],
    });

    // Alternatives for MC
    if (
      q.question_type === 'multiple_choice' &&
      q.alternatives.length > 0
    ) {
      const altItems: TiptapNode[] = q.alternatives.map((alt) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `${alt.letter}) `,
                marks: [{ type: 'bold' }],
              },
              { type: 'text', text: alt.text },
            ],
          },
        ],
      }));

      content.push({
        type: 'orderedList',
        attrs: { start: 1 },
        content: altItems,
      });
    }

    // Empty line between questions
    content.push({ type: 'paragraph' });
  });

  return {
    type: 'doc',
    content,
  };
}
