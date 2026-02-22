import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  FolderPlus,
  Briefcase,
  ArrowLeft,
  BookOpen,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

import { useWorkspaces } from '../hooks/useWorkspaces';
import { useFolders } from '../hooks/useFolders';
import WorkspaceList from '../components/WorkspaceList';
import FolderTree from '../components/FolderTree';
import FolderCard from '../components/FolderCard';
import ExamCard from '../components/ExamCard';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import CreateFolderModal from '../components/CreateFolderModal';
import Breadcrumb from '../../shared/components/Breadcrumb';
import type { BreadcrumbItem } from '../../shared/components/Breadcrumb';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import ExamDrawer from '../../drawer/components/ExamDrawer';
import SaveAsTemplateModal from '../../templates/components/SaveAsTemplateModal';
import TemplatePickerModal from '../../templates/components/TemplatePickerModal';
import MovePickerModal from '../components/MovePickerModal';
import type { Workspace } from '../types';
import type { Exam } from '../../../types';

const WorkspacePage: React.FC = () => {
  const { workspaceId, folderId } = useParams<{
    workspaceId?: string;
    folderId?: string;
  }>();
  const navigate = useNavigate();

  const {
    workspaces,
    loading: wsLoading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspaces();

  const {
    folderTree,
    loading: foldersLoading,
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    moveExamToFolder,
    fetchFolderPath,
    getExamsInFolder,
    getUnfiledExams,
  } = useFolders();

  const [unfiledExams, setUnfiledExams] = useState<Exam[]>([]);
  const [unfiledLoading, setUnfiledLoading] = useState(false);
  const [showUnfiled, setShowUnfiled] = useState(false);
  const [movingExamId, setMovingExamId] = useState<string | null>(null);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    folderId || null,
  );
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([]);

  // Modals
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>();
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'workspace' | 'folder'; id: string; name: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [showSidebar, setShowSidebar] = useState(true);

  // Move feature
  const [movingItem, setMovingItem] = useState<{
    type: 'exam' | 'folder';
    id: string;
    name: string;
  } | null>(null);
  const [movePending, setMovePending] = useState(false);

  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (!movingItem || !workspaceId) return;
    setMovePending(true);
    try {
      if (movingItem.type === 'exam') {
        await moveExamToFolder(movingItem.id, targetFolderId, workspaceId);
        loadExams();
        fetchFolders(workspaceId);
      } else {
        await moveFolder(movingItem.id, targetFolderId);
        fetchFolders(workspaceId);
        // If we moved the currently selected folder, go to root
        if (selectedFolderId === movingItem.id) {
          setSelectedFolderId(null);
          navigate(`/dashboard/workspaces/${workspaceId}`);
        }
      }
      setMovingItem(null);
    } catch (err) {
      console.error('Erro ao mover:', err);
    } finally {
      setMovePending(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  const loadUnfiledExams = useCallback(async () => {
    setUnfiledLoading(true);
    try {
      const data = await getUnfiledExams();
      setUnfiledExams(data);
    } catch (err) {
      console.error('Erro ao carregar provas sem pasta:', err);
    } finally {
      setUnfiledLoading(false);
    }
  }, [getUnfiledExams]);

  const handleMoveExamHere = async (exam: Exam) => {
    if (!workspaceId) return;
    setMovingExamId(exam.id);
    try {
      await moveExamToFolder(exam.id, selectedFolderId, workspaceId);
      setUnfiledExams((prev) => prev.filter((e) => e.id !== exam.id));
      loadExams();
      // Recarrega pastas para atualizar contadores
      fetchFolders(workspaceId);
    } catch (err) {
      console.error('Erro ao mover prova:', err);
    } finally {
      setMovingExamId(null);
    }
  };

  // Load folders when workspace changes
  useEffect(() => {
    if (workspaceId) {
      fetchFolders(workspaceId);
      loadUnfiledExams();
    }
  }, [workspaceId, fetchFolders, loadUnfiledExams]);

  // Load exams when folder changes
  const loadExams = useCallback(async () => {
    if (!workspaceId) return;
    setExamsLoading(true);
    try {
      const data = await getExamsInFolder(selectedFolderId, workspaceId);
      setExams(data);
    } catch (err) {
      console.error('Erro ao carregar provas:', err);
    } finally {
      setExamsLoading(false);
    }
  }, [workspaceId, selectedFolderId, getExamsInFolder]);

  useEffect(() => {
    if (workspaceId) {
      loadExams();
    }
  }, [workspaceId, selectedFolderId, loadExams]);

  // Update breadcrumbs
  useEffect(() => {
    const updateBreadcrumbs = async () => {
      const items: BreadcrumbItem[] = [];

      if (currentWorkspace) {
        items.push({
          id: currentWorkspace.id,
          label: currentWorkspace.name,
          onClick: () => {
            setSelectedFolderId(null);
            navigate(`/dashboard/workspaces/${currentWorkspace.id}`);
          },
        });
      }

      if (selectedFolderId) {
        const path = await fetchFolderPath(selectedFolderId);
        path.forEach((p) => {
          items.push({
            id: p.id,
            label: p.name,
            onClick: () => {
              setSelectedFolderId(p.id);
              navigate(
                `/dashboard/workspaces/${workspaceId}/folder/${p.id}`,
              );
            },
          });
        });
      }

      setBreadcrumbItems(items);
    };

    updateBreadcrumbs();
  }, [currentWorkspace, selectedFolderId, workspaceId, fetchFolderPath, navigate]);

  // Sync URL folderId with state
  useEffect(() => {
    setSelectedFolderId(folderId || null);
  }, [folderId]);

  const handleSelectFolder = (id: string | null) => {
    setSelectedFolderId(id);
    if (id) {
      navigate(`/dashboard/workspaces/${workspaceId}/folder/${id}`);
    } else {
      navigate(`/dashboard/workspaces/${workspaceId}`);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'exam' && overData?.type === 'folder') {
      const exam = activeData.exam as Exam;
      const targetFolder = overData.folder;
      await moveExamToFolder(exam.id, targetFolder.id);
      loadExams();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === 'workspace') {
        await deleteWorkspace(deletingItem.id);
        navigate('/dashboard/workspaces');
      } else {
        await deleteFolder(deletingItem.id);
        if (selectedFolderId === deletingItem.id) {
          setSelectedFolderId(null);
        }
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    } finally {
      setDeletingItem(null);
    }
  };

  // Subfolders for the current view
  const currentSubfolders = React.useMemo(() => {
    const findChildren = (nodes: typeof folderTree, parentId: string | null): typeof folderTree => {
      if (!parentId) return nodes;
      for (const node of nodes) {
        if (node.id === parentId) return node.children;
        const found = findChildren(node.children, parentId);
        if (found.length > 0 || node.children.some(c => c.id === parentId)) {
          const target = node.children.find(c => c.id === parentId);
          return target ? target.children : found;
        }
      }
      return [];
    };
    return findChildren(folderTree, selectedFolderId);
  }, [folderTree, selectedFolderId]);

  // ===== WORKSPACE LIST VIEW =====
  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minhas Provas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Organize suas provas em workspaces e pastas
            </p>
          </div>
          <button
            onClick={() => setShowCreateWs(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Workspace</span>
          </button>
        </div>

        {wsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum workspace criado
            </h3>
            <p className="text-gray-500 mb-4">
              Crie um workspace para organizar suas provas
            </p>
            <button
              onClick={() => setShowCreateWs(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Workspace
            </button>
          </div>
        ) : (
          <WorkspaceList
            workspaces={workspaces}
            onSelect={(ws) => navigate(`/dashboard/workspaces/${ws.id}`)}
            onEdit={(ws) => setEditingWs(ws)}
            onDelete={(ws) =>
              setDeletingItem({ type: 'workspace', id: ws.id, name: ws.name })
            }
          />
        )}

        <CreateWorkspaceModal
          isOpen={showCreateWs}
          onClose={() => setShowCreateWs(false)}
          onSubmit={async (name, desc, color) => {
            await createWorkspace(name, desc, color);
          }}
        />

        {editingWs && (
          <CreateWorkspaceModal
            isOpen={true}
            onClose={() => setEditingWs(null)}
            onSubmit={async (name, desc, color) => {
              await updateWorkspace(editingWs.id, {
                name,
                description: desc,
                color,
              });
              setEditingWs(null);
            }}
            initialData={{
              name: editingWs.name,
              description: editingWs.description || '',
              color: editingWs.color,
            }}
            isEditing
          />
        )}

        <ConfirmDialog
          isOpen={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteConfirm}
          title={`Excluir ${deletingItem?.type === 'workspace' ? 'workspace' : 'pasta'}`}
          message={`Tem certeza que deseja excluir "${deletingItem?.name}"? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir"
        />
      </div>
    );
  }

  // ===== WORKSPACE DETAIL VIEW (folders + exams) =====
  const sortableItems = [
    ...currentSubfolders.map((f) => `folder-${f.id}`),
    ...exams.map((e) => `exam-${e.id}`),
  ];

  return (
    <div className="flex h-full">
      {/* Folder Tree Sidebar */}
      {showSidebar && (
        <div className="w-60 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto hidden lg:block">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Pastas
            </h3>
            <FolderTree
              tree={folderTree}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onRenameFolder={(id, name) => setRenamingFolder({ id, name })}
              onDeleteFolder={(id) => {
                const folder = folderTree.find((f) => f.id === id);
                setDeletingItem({
                  type: 'folder',
                  id,
                  name: folder?.name || 'Pasta',
                });
              }}
              onCreateSubfolder={(parentId) => {
                setCreateFolderParentId(parentId);
                setShowCreateFolder(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard/workspaces')}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentWorkspace?.name || 'Workspace'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => {
                setCreateFolderParentId(selectedFolderId || undefined);
                setShowCreateFolder(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nova Pasta</span>
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mb-4">
          <Breadcrumb
            items={breadcrumbItems}
            homeLabel="Workspaces"
            onHomeClick={() => navigate('/dashboard/workspaces')}
          />
        </div>

        {/* Content Grid with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
            {foldersLoading || examsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : currentSubfolders.length === 0 && exams.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pasta vazia
                </h3>
                <p className="text-gray-500 mb-4">
                  Crie uma subpasta ou acesse o Gerador de Provas IA para criar provas
                </p>
                <button
                  onClick={() => {
                    setCreateFolderParentId(selectedFolderId || undefined);
                    setShowCreateFolder(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Criar Subpasta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentSubfolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onClick={() => handleSelectFolder(folder.id)}
                    onRename={() =>
                      setRenamingFolder({ id: folder.id, name: folder.name })
                    }
                    onDelete={() =>
                      setDeletingItem({
                        type: 'folder',
                        id: folder.id,
                        name: folder.name,
                      })
                    }
                    onMove={() =>
                      setMovingItem({
                        type: 'folder',
                        id: folder.id,
                        name: folder.name,
                      })
                    }
                    examCount={folder.exam_count}
                  />
                ))}
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onClick={() => setSelectedExam(exam)}
                    onMove={() =>
                      setMovingItem({
                        type: 'exam',
                        id: exam.id,
                        name: exam.title,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>

        {/* Provas sem organização */}
        {(unfiledExams.length > 0 || unfiledLoading) && (
          <div className="mt-8 border-t border-dashed border-gray-200 pt-6">
            <button
              onClick={() => setShowUnfiled(!showUnfiled)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-4 transition-colors"
            >
              {showUnfiled ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Inbox className="w-4 h-4" />
              <span>
                Provas geradas sem organização ({unfiledExams.length})
              </span>
            </button>

            {showUnfiled && (
              unfiledLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unfiledExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="bg-white rounded-xl border border-dashed border-gray-300 p-4 hover:border-blue-300 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                        {exam.title}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">{exam.subject}</p>
                      <button
                        onClick={() => handleMoveExamHere(exam)}
                        disabled={movingExamId === exam.id}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>
                          {movingExamId === exam.id
                            ? 'Movendo...'
                            : selectedFolderId
                            ? 'Mover para esta pasta'
                            : 'Mover para este workspace'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Exam Drawer */}
      <ExamDrawer
        exam={selectedExam}
        isOpen={!!selectedExam}
        onClose={() => setSelectedExam(null)}
        onSaveAsTemplate={() => {
          setShowTemplateModal(true);
        }}
      />

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setCreateFolderParentId(undefined);
        }}
        onSubmit={async (name) => {
          if (workspaceId) {
            await createFolder(name, workspaceId, createFolderParentId);
          }
        }}
      />

      {renamingFolder && (
        <CreateFolderModal
          isOpen={true}
          onClose={() => setRenamingFolder(null)}
          onSubmit={async (name) => {
            await renameFolder(renamingFolder.id, name);
            setRenamingFolder(null);
          }}
          initialName={renamingFolder.name}
          isEditing
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title={`Excluir ${deletingItem?.type === 'workspace' ? 'workspace' : 'pasta'}`}
        message={`Tem certeza que deseja excluir "${deletingItem?.name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      {selectedExam && (
        <SaveAsTemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          exam={selectedExam}
        />
      )}

      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        workspaceId={workspaceId}
        folderId={selectedFolderId}
        onExamCreated={loadExams}
      />

      {/* Move Picker Modal */}
      <MovePickerModal
        isOpen={!!movingItem}
        onClose={() => setMovingItem(null)}
        onMove={handleMoveConfirm}
        folders={folderTree}
        excludeFolderId={movingItem?.type === 'folder' ? movingItem.id : undefined}
        itemName={movingItem?.name ?? ''}
        moving={movePending}
      />
    </div>
  );
};

export default WorkspacePage;
