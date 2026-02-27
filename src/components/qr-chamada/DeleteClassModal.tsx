import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  className: string;
}

const DeleteClassModal: React.FC<DeleteClassModalProps> = ({ isOpen, onClose, onConfirm, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Excluir Turma</h2>
              <p className="text-xs text-gray-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">
            Tem certeza que deseja excluir a turma{' '}
            <span className="font-semibold text-gray-900">"{className}"</span>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Todos os dados de presença e sessões relacionadas também serão excluídos permanentemente.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Excluir Turma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteClassModal;
