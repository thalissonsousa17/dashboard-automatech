import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, ExternalLink, Play, X, LifeBuoy, BookOpen, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DOCS = [
  { label: "Como usar o Gerador de Provas IA", href: "#" },
  { label: "Como configurar o QR Chamada", href: "#" },
  { label: "Gerenciar Assinatura & Planos", href: "#" },
  { label: "Usar o Editor de Documentos", href: "#" },
];

const TUTORIALS = [
  { label: "Gerando sua primeira prova com IA", videoId: "dQw4w9WgXcQ" },
  { label: "Chamada por QR Code passo a passo", videoId: "dQw4w9WgXcQ" },
  { label: "Organizando provas em workspaces", videoId: "dQw4w9WgXcQ" },
];

const HelpMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [youtubeVideo, setYoutubeVideo] = useState<{ label: string; videoId: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          title="Ajuda"
        >
          <HelpCircle className="w-4 h-4 text-gray-600" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-600" />
                Central de Ajuda
              </span>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Docs */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Documentação
              </p>
              <div className="space-y-1">
                {DOCS.map((d) => (
                  <a
                    key={d.label}
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 py-1 px-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    <span>{d.label}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>

            {/* Tutorials */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Play className="w-3 h-3" /> Tutoriais em Vídeo
              </p>
              <div className="space-y-1">
                {TUTORIALS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => { setYoutubeVideo(t); setOpen(false); }}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 py-1 px-1 rounded hover:bg-blue-50 transition-colors w-full text-left"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                      <Play className="w-3 h-3 text-red-600 fill-red-600" />
                    </div>
                    <span className="flex-1">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Support link */}
            <div className="px-4 py-3 bg-blue-50">
              <button
                onClick={() => { setOpen(false); navigate("/dashboard/suporte"); }}
                className="flex items-center gap-2 text-sm text-blue-700 font-semibold hover:text-blue-800 w-full"
              >
                <LifeBuoy className="w-4 h-4" />
                Abrir página de Suporte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* YouTube Modal */}
      {youtubeVideo && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setYoutubeVideo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">{youtubeVideo.label}</p>
              <button onClick={() => setYoutubeVideo(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideo.videoId}?autoplay=1`}
                title={youtubeVideo.label}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpMenu;
