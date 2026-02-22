import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Check, AlertCircle } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import type { Document } from '../hooks/useDocuments';
import ExamEditorView from '../components/ExamEditorView';

const StandaloneEditorPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { loadDocument, saveDocument, saving } = useDocuments();

  const [doc, setDoc] = useState<Document | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [title, setTitle] = useState('Documento sem título');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const currentJsonRef = useRef<Record<string, unknown> | null>(null);
  const currentHtmlRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o documento
  useEffect(() => {
    const load = async () => {
      if (!docId) return;
      setPageLoading(true);
      const loaded = await loadDocument(docId);
      if (loaded) {
        setDoc(loaded);
        setTitle(loaded.title);
      }
      setPageLoading(false);
    };
    load();
  }, [docId, loadDocument]);

  // Auto-save com debounce de 30s
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!docId || !currentJsonRef.current) return;
      const ok = await saveDocument(docId, currentJsonRef.current, currentHtmlRef.current, title);
      if (ok) {
        setIsDirty(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 30000);
  }, [docId, saveDocument, title]);

  // Limpa o timer no unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleEditorUpdate = (json: Record<string, unknown>, html: string) => {
    currentJsonRef.current = json;
    currentHtmlRef.current = html;
    setIsDirty(true);
    setSaveStatus('idle');
    triggerAutoSave();
  };

  const handleSave = async () => {
    if (!docId || !currentJsonRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const ok = await saveDocument(docId, currentJsonRef.current, currentHtmlRef.current, title);
    if (ok) {
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  const handleTitleBlur = async () => {
    if (!docId || !doc) return;
    if (title !== doc.title) {
      // Salva apenas o título imediatamente
      const json = currentJsonRef.current || doc.content_json || {};
      const html = currentHtmlRef.current || doc.content_html || '';
      await saveDocument(docId, json as Record<string, unknown>, html, title);
      setDoc((prev) => prev ? { ...prev, title } : prev);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p>Documento não encontrado.</p>
        <button onClick={() => navigate('/dashboard/documents')} className="mt-3 text-blue-600 hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/dashboard/documents')}
            className="p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          {/* Título editável inline */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            onBlur={handleTitleBlur}
            className="flex-1 text-base font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 min-w-0 truncate transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
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
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      {/* Editor — mesmo componente do editor de provas */}
      <div className="flex-1 overflow-y-auto">
        <ExamEditorView
          initialContent={doc.content_json}
          onUpdate={handleEditorUpdate}
        />
      </div>
    </div>
  );
};

export default StandaloneEditorPage;
