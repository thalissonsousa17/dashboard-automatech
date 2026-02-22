import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  FileText,
  Trash2,
  Clock,
  Search,
  FolderOpen,
  Folder,
  X,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Briefcase,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDocuments } from '../hooks/useDocuments';
import type { Document } from '../hooks/useDocuments';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import type { Workspace, ExamFolder } from '../../workspace/types';
import type { Exam } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface BreadcrumbItem {
  id: string | null; // null = raiz do workspace
  name: string;
}

// ── Modal: Navegador de Minhas Provas ────────────────────────────────────────
const ExamBrowserModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);

  // Navegação de pastas
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Conteúdo do nível atual
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // UX
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  // 1. Carrega workspaces
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await db
        .from('exam_workspaces')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: true });
      const list = (data as Workspace[]) || [];
      setWorkspaces(list);
      if (list.length > 0) setSelectedWs(list[0]);
    };
    load();
  }, [user]);

  // 2. Ao selecionar workspace ou mudar de pasta, carrega conteúdo
  const loadLevel = useCallback(async (wsId: string, folderId: string | null) => {
    setLoading(true);
    try {
      // Pastas deste nível
      const folderQuery = db
        .from('exam_folders')
        .select('*')
        .eq('workspace_id', wsId)
        .order('name', { ascending: true });

      const resolvedFolderQuery = folderId
        ? folderQuery.eq('parent_id', folderId)
        : folderQuery.is('parent_id', null);

      const { data: folderData } = await resolvedFolderQuery;
      setFolders((folderData as ExamFolder[]) || []);

      // Provas deste nível
      const examQuery = db
        .from('exams')
        .select('id, title, subject, created_at, updated_at')
        .eq('workspace_id', wsId)
        .order('title', { ascending: true });

      const resolvedExamQuery = folderId
        ? examQuery.eq('folder_id', folderId)
        : examQuery.is('folder_id', null);

      const { data: examData } = await resolvedExamQuery;
      setExams((examData as Exam[]) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedWs) return;
    setBreadcrumb([]);
    setCurrentFolderId(null);
    setQuery('');
    loadLevel(selectedWs.id, null);
  }, [selectedWs, loadLevel]);

  // Navegar para dentro de uma pasta
  const enterFolder = (folder: ExamFolder) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setQuery('');
    if (selectedWs) loadLevel(selectedWs.id, folder.id);
  };

  // Navegar via breadcrumb
  const goToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Raiz do workspace
      setBreadcrumb([]);
      setCurrentFolderId(null);
      if (selectedWs) loadLevel(selectedWs.id, null);
    } else {
      const crumb = breadcrumb[index];
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setCurrentFolderId(crumb.id);
      if (selectedWs) loadLevel(selectedWs.id, crumb.id);
    }
    setQuery('');
  };

  const handleOpenExam = (examId: string) => {
    navigate(`/dashboard/editor/${examId}`);
    onClose();
  };

  // Filtragem
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      (e.subject || '').toLowerCase().includes(query.toLowerCase()),
  );

  const isEmpty = !loading && filteredFolders.length === 0 && filteredExams.length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">

        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Minhas Provas</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Workspaces - abas horizontais */}
        {workspaces.length > 0 && (
          <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-gray-100 overflow-x-auto">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => setSelectedWs(ws)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  selectedWs?.id === ws.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                <span>{ws.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Breadcrumb de navegação */}
        {selectedWs && (
          <div className="flex items-center space-x-1 px-5 py-2 text-xs text-gray-500 border-b border-gray-100 min-h-[36px]">
            <button
              onClick={() => goToBreadcrumb(-1)}
              className="hover:text-blue-600 transition-colors font-medium truncate max-w-[120px]"
            >
              {selectedWs.name}
            </button>
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-300" />
                {idx < breadcrumb.length - 1 ? (
                  <button
                    onClick={() => goToBreadcrumb(idx)}
                    className="hover:text-blue-600 transition-colors truncate max-w-[120px]"
                  >
                    {crumb.name}
                  </button>
                ) : (
                  <span className="text-gray-700 font-medium truncate max-w-[160px]">
                    {crumb.name}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pastas ou provas..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {/* Botão voltar (quando estiver dentro de uma pasta) */}
          {breadcrumb.length > 0 && !query && (
            <button
              onClick={() => goToBreadcrumb(breadcrumb.length - 2)}
              className="w-full flex items-center space-x-2 px-5 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Briefcase className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm text-gray-500">Nenhum workspace criado</p>
              <p className="text-xs text-gray-400 mt-1">Crie workspaces em "Minhas Provas"</p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm text-gray-500">
                {query ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {/* Pastas */}
              {filteredFolders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => enterFolder(folder)}
                    className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 w-9 h-9 bg-yellow-50 border border-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                      <Folder className="w-5 h-5 text-yellow-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {folder.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </button>
                </li>
              ))}

              {/* Provas */}
              {filteredExams.map((exam) => (
                <li key={exam.id}>
                  <button
                    onClick={() => handleOpenExam(exam.id)}
                    className="w-full flex items-center space-x-3 px-5 py-3 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 w-9 h-9 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                      {exam.subject && (
                        <p className="text-xs text-gray-400 truncate">{exam.subject}</p>
                      )}
                    </div>
                    <ExternalLink className="flex-shrink-0 w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Página principal ─────────────────────────────────────────────────────────
const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { documents, loading, fetchDocuments, createDocument, deleteDocument } =
    useDocuments();

  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showExamBrowser, setShowExamBrowser] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleNew = async () => {
    setCreating(true);
    const id = await createDocument();
    setCreating(false);
    if (id) navigate(`/dashboard/documents/${id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteDocument(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Editor de Documentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crie e edite documentos com formatação Word-like
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExamBrowser(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-gray-500" />
            <span>Buscar em Minhas Provas</span>
          </button>

          <button
            onClick={handleNew}
            disabled={creating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <FilePlus className="w-4 h-4" />
            <span>{creating ? 'Criando...' : 'Novo Documento'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">Nenhum documento ainda</p>
            <p className="text-sm mt-1">Crie um documento em branco ou abra uma prova existente</p>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setShowExamBrowser(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span>Buscar em Minhas Provas</span>
              </button>
              <button
                onClick={handleNew}
                disabled={creating}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FilePlus className="w-4 h-4" />
                <span>{creating ? 'Criando...' : 'Criar primeiro documento'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                className="group relative flex flex-col bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-center w-12 h-14 bg-blue-50 rounded-lg mb-3 border border-blue-100">
                  <FileText className="w-7 h-7 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight flex-1">
                  {doc.title}
                </p>
                <div className="flex items-center space-x-1 mt-3 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(doc.updated_at)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc); }}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir documento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal navegador */}
      {showExamBrowser && <ExamBrowserModal onClose={() => setShowExamBrowser(false)} />}

      {/* Confirm delete */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir documento"
        message={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DocumentsPage;
