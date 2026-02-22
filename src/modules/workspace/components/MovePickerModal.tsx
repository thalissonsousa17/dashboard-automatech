import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import type { FolderNode } from '../types';

interface MovePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
  folders: FolderNode[];
  excludeFolderId?: string;
  itemName: string;
  moving?: boolean;
}

interface FlatFolder {
  id: string;
  name: string;
  depth: number;
}

function flattenTree(
  nodes: FolderNode[],
  excludeId?: string,
  depth = 0,
): FlatFolder[] {
  const result: FlatFolder[] = [];
  for (const node of nodes) {
    if (node.id === excludeId) continue; // skip self and all its children
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenTree(node.children, excludeId, depth + 1));
  }
  return result;
}

const MovePickerModal: React.FC<MovePickerModalProps> = ({
  isOpen,
  onClose,
  onMove,
  folders,
  excludeFolderId,
  itemName,
  moving = false,
}) => {
  if (!isOpen) return null;

  const flat = flattenTree(folders, excludeFolderId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mover para...</h2>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              &ldquo;{itemName}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={moving}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Destination list */}
        <div className="overflow-y-auto max-h-72 py-2">
          {/* Root of workspace */}
          <button
            onClick={() => onMove(null)}
            disabled={moving}
            className="flex items-center w-full px-5 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4 mr-2.5 text-gray-400 flex-shrink-0" />
            <span className="font-medium">Raiz do workspace</span>
          </button>

          {flat.map((f) => (
            <button
              key={f.id}
              onClick={() => onMove(f.id)}
              disabled={moving}
              className="flex items-center w-full py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
              style={{ paddingLeft: `${20 + f.depth * 16}px`, paddingRight: '20px' }}
            >
              <FolderOpen className="w-4 h-4 mr-2.5 text-blue-400 flex-shrink-0" />
              {f.name}
            </button>
          ))}

          {flat.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              Nenhuma pasta disponível
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            disabled={moving}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovePickerModal;
