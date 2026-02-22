import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
// Tiptap v3: TextStyle, FontFamily, Color e FontSize estão todos em extension-text-style
import { TextStyle, FontFamily, Color, FontSize } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
// Table e sub-extensões estão todas em @tiptap/extension-table
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import EditorToolbar from './EditorToolbar';

interface ExamEditorViewProps {
  initialContent: Record<string, unknown> | null;
  onUpdate: (json: Record<string, unknown>, html: string) => void;
}

const ExamEditorView: React.FC<ExamEditorViewProps> = ({
  initialContent,
  onUpdate,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder: 'Comece a editar o documento...',
      }),
      // Formatação avançada (Tiptap v3 — pacote unificado)
      TextStyle,
      FontFamily,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      // Tabelas
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      // Imagens
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: initialContent || '<p></p>',
    onUpdate: ({ editor: e }) => {
      onUpdate(e.getJSON() as Record<string, unknown>, e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style:
          'min-height: 960px; padding: 80px 96px; font-family: "Calibri", "Segoe UI", sans-serif; font-size: 11pt; line-height: 1.6; color: #000;',
      },
    },
  });

  return (
    <div className="flex flex-col">
      {/* Ribbon — sticky to the nearest scrollable container */}
      <div className="sticky top-0 z-10 shadow-md">
        <EditorToolbar editor={editor} />
      </div>

      {/* Word-like canvas: gray background, A4 page centered */}
      <div className="bg-[#e8e6e3] min-h-screen py-8 px-4">
        <div
          className="bg-white mx-auto shadow-[0_2px_10px_rgba(0,0,0,0.28)]"
          style={{ width: '794px', minHeight: '1123px' }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default ExamEditorView;
