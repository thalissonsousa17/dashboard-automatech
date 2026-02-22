import React, { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Minus,
  ChevronDown,
  Table,
  Image,
  Highlighter,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

// Grade para inserção de tabela
const TABLE_ROWS = 6;
const TABLE_COLS = 6;

const TableGrid: React.FC<{
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}> = ({ onInsert, onClose }) => {
  const [hovered, setHovered] = useState({ row: 0, col: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white border border-[#d1d1d1] shadow-lg rounded-sm p-2 z-50"
    >
      <p className="text-[10px] text-[#605e5c] mb-1.5 text-center">
        {hovered.row > 0 && hovered.col > 0
          ? `${hovered.row} × ${hovered.col}`
          : 'Inserir tabela'}
      </p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${TABLE_COLS}, 1fr)` }}>
        {Array.from({ length: TABLE_ROWS }).map((_, r) =>
          Array.from({ length: TABLE_COLS }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              onMouseEnter={() => setHovered({ row: r + 1, col: c + 1 })}
              onMouseLeave={() => setHovered({ row: 0, col: 0 })}
              onClick={() => { onInsert(r + 1, c + 1); onClose(); }}
              className={`w-5 h-5 border cursor-pointer transition-colors ${
                r < hovered.row && c < hovered.col
                  ? 'bg-[#cfe4f4] border-[#2B579A]'
                  : 'bg-white border-[#d1d1d1] hover:bg-gray-100'
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const [showTableGrid, setShowTableGrid] = useState(false);

  if (!editor) return null;

  const getCurrentStyleValue = (): string => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'p';
  };

  const applyStyle = (value: string) => {
    switch (value) {
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      default: editor.chain().focus().setParagraph().run();
    }
  };

  const getCurrentFont = (): string =>
    (editor.getAttributes('textStyle').fontFamily as string) || 'Calibri';

  const getCurrentFontSize = (): string =>
    (editor.getAttributes('textStyle').fontSize as string) || '11pt';

  const getCurrentColor = (): string =>
    (editor.getAttributes('textStyle').color as string) || '#000000';

  const insertImageByUrl = () => {
    const url = window.prompt('URL da imagem:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  // ── Sub-componentes ──────────────────────────────────────────
  const Btn: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive, disabled, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center w-[26px] h-[26px] rounded-sm transition-colors
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? 'bg-[#cfe4f4] text-[#2B579A]'
          : disabled ? 'text-gray-400' : 'text-[#3c3c3c] hover:bg-[#e6e6e6]'}
      `}
    >
      {children}
    </button>
  );

  const GroupDivider = () => <div className="w-px self-stretch bg-[#d1d1d1] mx-1.5" />;

  const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col items-center px-1 pt-1 pb-0.5">
      <div className="flex items-center gap-0.5 flex-wrap">{children}</div>
      <span className="text-[9px] text-[#605e5c] mt-0.5 leading-none whitespace-nowrap">{label}</span>
    </div>
  );

  const SelectControl: React.FC<{
    value: string;
    onChange: (v: string) => void;
    width: string;
    children: React.ReactNode;
  }> = ({ value, onChange, width, children }) => (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[26px] pl-2 pr-5 text-xs border border-[#d1d1d1] bg-white text-[#3c3c3c] appearance-none cursor-pointer hover:border-[#2B579A] focus:outline-none focus:border-[#2B579A] rounded-sm"
        style={{ width }}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-[#605e5c] pointer-events-none" />
    </div>
  );

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="flex items-stretch flex-wrap border-b border-[#d1d1d1] bg-[#f3f2f1] px-2 select-none">

      {/* Desfazer / Refazer */}
      <Group label="Desfazer">
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer (Ctrl+Y)">
          <Redo2 className="w-3.5 h-3.5" />
        </Btn>
      </Group>

      <GroupDivider />

      {/* Estilo de parágrafo */}
      <Group label="Estilo">
        <SelectControl value={getCurrentStyleValue()} onChange={applyStyle} width="110px">
          <option value="p">Normal</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
        </SelectControl>
      </Group>

      <GroupDivider />

      {/* Fonte */}
      <Group label="Fonte">
        <SelectControl
          value={getCurrentFont()}
          onChange={(v) => editor.chain().focus().setFontFamily(v).run()}
          width="120px"
        >
          <option value="Calibri">Calibri</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </SelectControl>
      </Group>

      {/* Tamanho */}
      <Group label="Tamanho">
        <SelectControl
          value={getCurrentFontSize()}
          onChange={(v) => editor.chain().focus().setFontSize(v).run()}
          width="60px"
        >
          {['8pt','9pt','10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt','28pt','36pt','48pt','72pt'].map((s) => (
            <option key={s} value={s}>{s.replace('pt','')}</option>
          ))}
        </SelectControl>
      </Group>

      <GroupDivider />

      {/* Formatação de caractere */}
      <Group label="Formatação">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado">
          <Strikethrough className="w-3.5 h-3.5" />
        </Btn>
      </Group>

      <GroupDivider />

      {/* Cor e Realce */}
      <Group label="Cor">
        {/* Cor do texto */}
        <div className="relative flex items-center" title="Cor do texto">
          <input
            type="color"
            value={getCurrentColor()}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="absolute opacity-0 w-full h-full cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center w-[26px] h-[26px] rounded-sm hover:bg-[#e6e6e6] cursor-pointer">
            <span className="text-[11px] font-bold text-[#3c3c3c] leading-none">A</span>
            <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: getCurrentColor() }} />
          </div>
        </div>
        {/* Realce */}
        <Btn
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#FFF176' }).run()}
          isActive={editor.isActive('highlight')}
          title="Realçar texto"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </Btn>
      </Group>

      <GroupDivider />

      {/* Listas */}
      <Group label="Listas">
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista com marcadores">
          <List className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </Btn>
      </Group>

      <GroupDivider />

      {/* Alinhamento */}
      <Group label="Parágrafo">
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda (Ctrl+L)">
          <AlignLeft className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centralizar (Ctrl+E)">
          <AlignCenter className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita (Ctrl+R)">
          <AlignRight className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justificar (Ctrl+J)">
          <AlignJustify className="w-3.5 h-3.5" />
        </Btn>
      </Group>

      <GroupDivider />

      {/* Inserir: Tabela + Imagem + Linha */}
      <Group label="Inserir">
        {/* Botão tabela com grade popover */}
        <div className="relative">
          <Btn
            onClick={() => setShowTableGrid((v) => !v)}
            isActive={showTableGrid}
            title="Inserir tabela"
          >
            <Table className="w-3.5 h-3.5" />
          </Btn>
          {showTableGrid && (
            <TableGrid
              onInsert={(rows, cols) =>
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
              }
              onClose={() => setShowTableGrid(false)}
            />
          )}
        </div>

        <Btn onClick={insertImageByUrl} title="Inserir imagem (URL)">
          <Image className="w-3.5 h-3.5" />
        </Btn>

        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha horizontal">
          <Minus className="w-3.5 h-3.5" />
        </Btn>
      </Group>

    </div>
  );
};

export default EditorToolbar;
