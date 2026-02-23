import React, { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  Play,
  ExternalLink,
  X,
  Search,
  Youtube,
  FileText,
  Loader2,
} from "lucide-react";
import { useHelpItems, HelpItem } from "../hooks/useHelpItems";

// ── YouTube Modal ─────────────────────────────────────────────────────────────
interface YoutubeModalProps {
  video: HelpItem;
  onClose: () => void;
}

const YoutubeModal: React.FC<YoutubeModalProps> = ({ video, onClose }) => (
  <div
    className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Youtube className="w-4 h-4 text-red-600" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">{video.title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  </div>
);

// ── Card de Documentação ──────────────────────────────────────────────────────
interface DocCardProps {
  item: HelpItem;
}

const DocCard: React.FC<DocCardProps> = ({ item }): JSX.Element => {
  const hasUrl = Boolean(item.url && item.url !== "#" && item.url.startsWith("http"));

  if (!hasUrl) {
    return (
      <div className="group flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-default">
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {item.title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Em breve</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={item.url!}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="group flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl transition-all hover:border-blue-300 hover:shadow-sm cursor-pointer"
    >
      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
        <FileText className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
          {item.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.url}</p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
    </a>
  );
};

// ── Card de Vídeo ─────────────────────────────────────────────────────────────
interface VideoCardProps {
  item: HelpItem;
  onPlay: (item: HelpItem) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ item, onPlay }) => {
  const thumbUrl = item.video_id
    ? `https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`
    : null;

  return (
    <button
      onClick={() => onPlay(item)}
      className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-red-300 hover:shadow-sm transition-all text-left w-full"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Youtube className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className="w-6 h-6 bg-red-50 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
          <Play className="w-3 h-3 text-red-600 fill-red-600" />
        </div>
        <p className="text-sm font-medium text-gray-800 group-hover:text-red-700 transition-colors leading-snug">
          {item.title}
        </p>
      </div>
    </button>
  );
};

// ── Página Principal ──────────────────────────────────────────────────────────
const AjudaProfessor: React.FC = () => {
  const { docs, videos, loading } = useHelpItems();
  const [search, setSearch] = useState("");
  const [playingVideo, setPlayingVideo] = useState<HelpItem | null>(null);

  // Apenas itens ativos
  const activeDocs = docs.filter((d) => d.active);
  const activeVideos = videos.filter((v) => v.active);

  // Filtrar por busca
  const q = search.toLowerCase().trim();
  const filteredDocs = q
    ? activeDocs.filter((d) => d.title.toLowerCase().includes(q))
    : activeDocs;
  const filteredVideos = q
    ? activeVideos.filter((v) => v.title.toLowerCase().includes(q))
    : activeVideos;

  const hasResults = filteredDocs.length > 0 || filteredVideos.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          Central de Ajuda
        </h1>
        <p className="text-sm text-gray-500 mt-1.5">
          Documentações e tutoriais em vídeo para aproveitar ao máximo a
          plataforma.
        </p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar documentação ou tutoriais..."
          className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando conteúdo...</span>
        </div>
      ) : !hasResults ? (
        <div className="py-20 text-center text-gray-400">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search
              ? "Nenhum resultado encontrado para sua busca."
              : "Nenhum conteúdo de ajuda disponível ainda."}
          </p>
        </div>
      ) : (
        <>
          {/* Documentação */}
          {filteredDocs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Documentação</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {filteredDocs.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDocs.map((item) => (
                  <DocCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Divisor */}
          {filteredDocs.length > 0 && filteredVideos.length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Tutoriais em Vídeo */}
          {filteredVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Youtube className="w-4 h-4 text-red-600" />
                <h2 className="font-semibold text-gray-800">
                  Tutoriais em Vídeo
                </h2>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {filteredVideos.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((item) => (
                  <VideoCard
                    key={item.id}
                    item={item}
                    onPlay={setPlayingVideo}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal de vídeo */}
      {playingVideo && (
        <YoutubeModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
};

export default AjudaProfessor;
