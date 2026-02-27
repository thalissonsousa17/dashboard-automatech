import React from 'react';
import { Users, QrCode, BarChart3, Trash2, History } from 'lucide-react';
import { QRClass } from '../../types/qr-chamada';

interface ClassCardProps {
  classData: QRClass;
  onGenerateQR: (classData: QRClass) => void;
  onViewReports: (classData: QRClass) => void;
  onDeleteClass: (classData: QRClass) => void;
  onViewQRHistory: (classData: QRClass) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({
  classData,
  onGenerateQR,
  onViewReports,
  onDeleteClass,
  onViewQRHistory,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
      {/* Header do card */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{classData.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {classData.description || 'Sem descrição'}
          </p>
          {classData.schedule && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
              {classData.schedule}
            </span>
          )}
        </div>
        <button
          onClick={() => onDeleteClass(classData)}
          className="ml-2 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
          title="Excluir turma"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {classData.studentCount > 0 && (
        <div className="flex items-center gap-1.5 mb-4 text-sm text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span>{classData.studentCount} aluno{classData.studentCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Botões de ação */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onGenerateQR(classData)}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Novo QR Code
        </button>

        <button
          onClick={() => onViewReports(classData)}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Relatórios
        </button>

        <button
          onClick={() => onViewQRHistory(classData)}
          className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <History className="w-4 h-4" />
          Histórico de Presença
        </button>
      </div>
    </div>
  );
};

export default ClassCard;
