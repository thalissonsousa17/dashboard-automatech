import React, { useState } from 'react';
import { X, LayoutTemplate, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '../hooks/useTemplates';
import TemplateCard from './TemplateCard';
import ConfirmDialog from '../../shared/components/ConfirmDialog';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string | null;
  folderId?: string | null;
  onExamCreated?: () => void;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  folderId,
  onExamCreated,
}) => {
  const navigate = useNavigate();
  const { templates, loading, createExamFromTemplate, deleteTemplate } = useTemplates();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()),
  );

  const handleUseTemplate = async (templateId: string) => {
    setCreating(templateId);
    try {
      const result = await createExamFromTemplate(
        templateId,
        workspaceId,
        folderId,
      );
      if (result) {
        onExamCreated?.();
        onClose();
        // Navigate to ExamGenerator to review the new exam
        navigate(`/dashboard/gerador-provas`);
      }
    } catch (err) {
      console.error('Erro ao criar prova do template:', err);
    } finally {
      setCreating(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await deleteTemplate(deletingId);
    } catch (err) {
      console.error('Erro ao excluir template:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <LayoutTemplate className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Criar a partir de Template
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar templates..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <LayoutTemplate className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                {templates.length === 0 ? (
                  <>
                    <p className="font-medium">Nenhum template criado</p>
                    <p className="text-sm mt-1">
                      Salve uma prova como template para reutilizar aqui
                    </p>
                  </>
                ) : (
                  <p>Nenhum template encontrado para "{search}"</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((template) => (
                  <div key={template.id} className="relative">
                    {creating === template.id && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 rounded-xl flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      </div>
                    )}
                    <TemplateCard
                      template={template}
                      onUse={() => handleUseTemplate(template.id)}
                      onDelete={() => setDeletingId(template.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Template"
        message="Tem certeza que deseja excluir este template? Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
      />
    </>
  );
};

export default TemplatePickerModal;
