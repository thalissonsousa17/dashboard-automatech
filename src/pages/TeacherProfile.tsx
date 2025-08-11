import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTeachingPosts } from '../hooks/useTeachingPosts';
import { 
  BookOpen, 
  User, 
  Calendar,
  Eye,
  Heart,
  FileText,
  Video,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  ExternalLink,
  Download,
  Home,
  X
} from 'lucide-react';

interface TeacherProfile {
  id: string;
  user_id: string;
  display_name: string;
  slug: string;
  bio: string;
  avatar_url?: string;
  is_public: boolean;
}

interface TeachingPost {
  id: string;
  title: string;
  description: string;
  author: string;
  subject: string;
  grade_level: string;
  created_at: string;
  files: {
    name: string;
    url: string;
    type: 'pdf' | 'ppt' | 'doc' | 'other';
  }[];
  videos: {
    title: string;
    url: string;
    platform: 'youtube' | 'vimeo' | 'other';
  }[];
  images: string[];
  tags: string[];
  likes: number;
  views: number;
}

const TeacherProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { incrementViews } = useTeachingPosts();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [posts, setPosts] = useState<TeachingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPost, setSelectedPost] = useState<TeachingPost | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (slug) {
      loadTeacherProfile();
    }
  }, [slug]);

  const loadTeacherProfile = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        setError('Sistema não configurado');
        return;
      }

      // Buscar perfil do professor pelo slug
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (profileError || !profileData) {
        setError('Professor não encontrado ou perfil não público');
        return;
      }

      setProfile(profileData);

      // Buscar posts do professor
      const { data: postsData, error: postsError } = await supabase
        .from('teaching_posts')
        .select('*')
        .eq('created_by', profileData.user_id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Erro ao carregar posts:', postsError);
      } else {
        setPosts(postsData || []);
      }

    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar perfil do professor');
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVimeoVideoId = (url: string) => {
    const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const handleDownload = (fileName: string, fileUrl: string) => {
    const mockFileContent = `Conteúdo do arquivo: ${fileName}\n\nEste é um arquivo de exemplo do Espaço Docente da Automatech.\nEm produção, este seria o conteúdo real do arquivo.`;
    const blob = new Blob([mockFileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    alert(`Download iniciado: ${fileName}`);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-600" />;
      case 'ppt': return <FileText className="w-4 h-4 text-orange-600" />;
      case 'doc': return <FileText className="w-4 h-4 text-blue-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const nextImage = () => {
    if (selectedPost && selectedPost.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === selectedPost.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedPost && selectedPost.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedPost.images.length - 1 : prev - 1
      );
    }
  };

  const incrementView = (postId) => {
    incrementViews(postId);
  setPosts((prevPosts) =>
    prevPosts.map((p) =>
      p.id === postId
        ? { ...p, views: (p.views || 0) + 1 }
        : p
    )
  );
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Professor não encontrado</h1>
          <p className="text-gray-600 mb-4">{error || 'O perfil solicitado não existe ou não está público.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Automatech</h1>
                <p className="text-xs text-gray-500">Plataforma Educacional</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Home</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.display_name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.display_name}</h1>
              <p className="text-lg text-gray-600 mb-4">{profile.bio}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {posts.length} publicações
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {posts.reduce((total, post) => total + post.views, 0)} visualizações
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
              {/* Post Image */}
              {post.images.length > 0 && (
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img
                    src={post.images[0]}
                    alt={post.title}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white font-semibold text-lg line-clamp-2">{post.title}</h3>
                  </div>
                </div>
              )}

              {/* Post Content */}
              <div className="p-6">
                {post.images.length === 0 && (
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{post.title}</h3>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(post.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="font-medium text-green-700">{post.subject}</span>
                    <span className="text-gray-500"> • {post.grade_level}</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {post.views}
                    </div>
                   
                  </div>
                  <div className="text-xs">
                    {post.files.length} arquivos
                    {post.videos.length > 0 && ` • ${post.videos.length} vídeos`}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    incrementView(post.id);
                    setSelectedPost(post);
                    setCurrentImageIndex(0);
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
                >
                  Ver Conteúdo Completo
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo publicado</h3>
            <p className="text-gray-500">Este professor ainda não publicou nenhum material.</p>
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPost.title}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {selectedPost.author}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Image Carousel */}
              {selectedPost.images.length > 0 && (
                <div className="relative mb-6">
                  <div className="relative h-80 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedPost.images[currentImageIndex]}
                      alt={`${selectedPost.title} - Imagem ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {selectedPost.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {selectedPost.images.length > 1 && (
                    <div className="flex justify-center mt-2 space-x-2">
                      {selectedPost.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descrição</h3>
                <p className="text-gray-700 leading-relaxed">{selectedPost.description}</p>
              </div>

              {/* Subject and Grade */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Disciplina</h4>
                  <p className="text-green-700 font-medium">{selectedPost.subject}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Nível</h4>
                  <p className="text-gray-700">{selectedPost.grade_level}</p>
                </div>
              </div>

              {/* Files */}
              {selectedPost.files.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Materiais Didáticos</h3>
                  <div className="space-y-2">
                    {selectedPost.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.type)}
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        </div>
                        <button
                          onClick={() => handleDownload(file.name, file.url)}
                          className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {selectedPost.videos.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vídeos Complementares</h3>
                  <div className="space-y-4">
                    {selectedPost.videos.map((video, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-gray-900 relative">
                          {video.platform === 'youtube' ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${getYouTubeVideoId(video.url)}`}
                              title={video.title}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : video.platform === 'vimeo' ? (
                            <iframe
                              src={`https://player.vimeo.com/video/${getVimeoVideoId(video.url)}`}
                              title={video.title}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 text-white hover:text-blue-300 transition-colors"
                              >
                                <Play className="w-12 h-12" />
                                <span>Assistir Vídeo</span>
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-gray-900">{video.title}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-500 capitalize">{video.platform}</span>
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Ver no {video.platform}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                 <div className="flex items-center text-sm text-gray-500">
                  <Eye className="w-4 h-4 mr-1" />
                  {selectedPost.views} visualizações
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;