import React from 'react';
import { Briefcase, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import type { Workspace } from '../types';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onSelect: (workspace: Workspace) => void;
  onEdit: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
}

const WorkspaceCard: React.FC<{
  workspace: Workspace;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ workspace, onSelect, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: workspace.color + '20' }}
        >
          <Briefcase className="w-5 h-5" style={{ color: workspace.color }} />
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-36">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
      {workspace.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {workspace.description}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-3">
        Criado em {new Date(workspace.created_at).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
};

const WorkspaceList: React.FC<WorkspaceListProps> = ({
  workspaces,
  onSelect,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workspaces.map((ws) => (
        <WorkspaceCard
          key={ws.id}
          workspace={ws}
          onSelect={() => onSelect(ws)}
          onEdit={() => onEdit(ws)}
          onDelete={() => onDelete(ws)}
        />
      ))}
    </div>
  );
};

export default WorkspaceList;
