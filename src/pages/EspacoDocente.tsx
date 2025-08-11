import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTeachingPosts } from '../hooks/useTeachingPosts';
import { downloadTeachingPostFile } from '../lib/supabase';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  User,
  Eye,
  Download,
  ExternalLink,
  FileText,
  Video,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Share2,
  MessageCircle,
  Edit,
  Trash2,
  Home
} from 'lucide-react';

import { TeachingPost } from '../hooks/useTeachingPosts';

const EspacoDocente: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { posts, loading, deletePost, updatePost, incrementViews } = useTeachingPosts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPost, setSelectedPost] = useState<TeachingPost | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingPost, setEditingPost] = useState<TeachingPost | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    author: '',
    subject: '',
    grade_level: '',
    tags: [] as string[]
  });

  // Função para extrair ID do vídeo do YouTube
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Função para extrair ID do vídeo do Vimeo
  const getVimeoVideoId = (url: string) => {
    const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Função para simular download de arquivos
  const handleDownload = (fileName: string, fileUrl: string) => {
    // Se for uma URL real do Supabase Storage, fazer download direto
    if (fileUrl.includes('supabase') && fileUrl.includes('storage')) {
      // Download direto via URL pública
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback para arquivos mock
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
    }
    
    console.log(`Download iniciado: ${fileName}`);
  };
  const subjects = [...new Set(posts.map(p => p.subject))];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || post.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

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

  const handleDeletePost = async (postId: string, postTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o post "${postTitle}"?`)) {
      try {
        await deletePost(postId);
        if (selectedPost?.id === postId) {
          setSelectedPost(null);
        }
      } catch (error) {
        alert('Erro ao excluir post');
      }
    }
  };

  const handleEditPost = (post: TeachingPost) => {
    setEditingPost(post);
    setEditForm({
      title: post.title,
      description: post.description,
      author: post.author,
      subject: post.subject,
      grade_level: post.grade_level,
      tags: [...post.tags]
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    
    try {
      await updatePost(editingPost.id, editForm);
      setEditingPost(null);
      // Atualizar post selecionado se for o mesmo
      if (selectedPost?.id === editingPost.id) {
        setSelectedPost({ ...editingPost, ...editForm });
      }
    } catch (error) {
      alert('Erro ao atualizar post');
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !editForm.tags.includes(tag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-64 border border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Header - Only show if not authenticated (public access) */}
      {!user && (
        <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Home</span>
                </button>
                <button
                  onClick={() => window.open('/login', '_blank')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
                >
                  Entrar no Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Page Header */}
      <div className={`text-center py-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl ${!user ? 'mt-20' : ''}`}>
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Espaço Docente</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Compartilhe conhecimento e materiais didáticos com a comunidade educacional
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por título, descrição ou autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Todas as disciplinas</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post) => (
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
                  <User className="w-4 h-4 mr-1" />
                  {post.author}
                </div>
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
                  setSelectedPost(post);
                  setCurrentImageIndex(0);
                }}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
              >
                Ver Conteúdo Completo
              </button>

              {/* Edit/Delete Buttons */}
              {/* Edit/Delete Buttons - Only show for authenticated users */}
              {user && (
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handleEditPost(post)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id, post.title)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
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
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
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

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div></div>
                <div className="flex items-center text-sm text-gray-500">
                  <Eye className="w-4 h-4 mr-1" />
                  {selectedPost.views} visualizações
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Editar Post</h2>
                <button
                  onClick={() => setEditingPost(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disciplina
                    </label>
                    <input
                      type="text"
                      value={editForm.subject}
                      onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nível
                    </label>
                    <input
                      type="text"
                      value={editForm.grade_level}
                      onChange={(e) => setEditForm(prev => ({ ...prev, grade_level: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Digite uma tag e pressione Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum conteúdo encontrado</h3>
          <p className="text-gray-500">Tente ajustar os filtros ou aguarde novos conteúdos serem publicados.</p>
        </div>
      )}
    </div>
  );
};

export default EspacoDocente;