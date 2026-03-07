import { MapPin, X } from 'lucide-react';

interface Props {
  onDecision: (allowed: boolean) => void;
}

export default function GpsPermissionModal({ onDecision }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        {/* Fechar sem aceitar */}
        <button
          onClick={() => onDecision(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ícone */}
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-teal-500/15 border border-teal-500/30">
          <MapPin size={28} className="text-teal-400" />
        </div>

        {/* Texto */}
        <h2 className="text-center text-lg font-semibold text-white mb-2">
          Permitir localização?
        </h2>
        <p className="text-center text-sm text-gray-400 mb-6 leading-relaxed">
          Usamos sua localização GPS para exibir sua posição exata no mapa de
          acessos. Sem GPS, usamos localização aproximada por IP.
        </p>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onDecision(true)}
            className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-medium text-sm transition-colors"
          >
            Permitir localização
          </button>
          <button
            onClick={() => onDecision(false)}
            className="w-full py-2.5 rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
