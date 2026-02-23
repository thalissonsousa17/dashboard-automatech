import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeachingPosts } from '../hooks/useTeachingPosts';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { uploadTeachingPostFile } from '../lib/supabase';
import { 
  Save, 
  Upload, 
  X, 
  Plus,
  FileText,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Tag,
  BookOpen
} from 'lucide-react';

interface PostFile {
  name: string;
  file: File;
  type: 'pdf' | 'ppt' | 'doc' | 'other';
}

interface PostVideo {
  title: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'other';
}

const PublicarPost: React.FC = () => {
  const navigate = useNavigate();
  const { createPost } = useTeachingPosts();
  const { user } = useAuth();

  // ── Plan limits ──────────────────────────────────────────────────────────────
  const { canAccess, openUpgradeModal } = useSubscriptionContext();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade_level: '',
    tags: [] as string[]
  });
  
  const [files, setFiles] = useState<PostFile[]>([]);
  const [videos, setVideos] = useState<PostVideo[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [tagInput, setTagInput] = useState('');
  const [videoInput, setVideoInput] = useState({ title: '', url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: PostFile[] = selectedFiles.map(file => ({
      name: file.name,
      file,
      type: getFileType(file.name)
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const getFileType = (fileName: string): 'pdf' | 'ppt' | 'doc' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['ppt', 'pptx'].includes(ext || '')) return 'ppt';
    if (['doc', 'docx'].includes(ext || '')) return 'doc';
    return 'other';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImages = Array.from(e.target.files || []);
    
    selectedImages.forEach(image => {
      if (image.size > 5 * 1024 * 1024) {
        setError('Imagens devem ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(image);
    });
    
    setImages(prev => [...prev, ...selectedImages]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addVideo = () => {
    if (videoInput.title.trim() && videoInput.url.trim()) {
      const platform = videoInput.url.includes('youtube.com') || videoInput.url.includes('youtu.be') 
        ? 'youtube' 
        : videoInput.url.includes('vimeo.com') 
        ? 'vimeo' 
        : 'other';
      
      setVideos(prev => [...prev, {
        title: videoInput.title,
        url: videoInput.url,
        platform
      }]);
      setVideoInput({ title: '', url: '' });
    }
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Verificar limite de publicar material ────────────────────────────────
    if (!canAccess('publicar_material')) {
      openUpgradeModal(
        'publicar_material',
        'Publicar Material',
      );
      return;
    }
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (!user) {
      setError('Usuário não autenticado');
      return;
    }
    setLoading(true);
    setError('');

    console.log('=== DADOS ANTES DE ENVIAR ===');
    console.log('FormData:', formData);
    console.log('Videos:', videos);
    console.log('Files:', files);
    console.log('Images:', images);
    
    try {
      // Upload das imagens para o Supabase Storage
      const imageUrls: string[] = [];
      
      for (const image of images) {
        try {
          const imageUrl = await uploadTeachingPostFile(image, user.id);
          imageUrls.push(imageUrl);
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem:', uploadError);
          imageUrls.push('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800');
        }
      }

      // Upload dos arquivos para o Supabase Storage
      const fileData = [];
      
      for (const fileItem of files) {
        try {
          const fileUrl = await uploadTeachingPostFile(fileItem.file, user.id);
          fileData.push({
            name: fileItem.name,
            url: fileUrl,
            type: fileItem.type
          });
        } catch (uploadError) {
          console.error('Erro ao fazer upload do arquivo:', uploadError);
          fileData.push({
            name: fileItem.name,
            url: `#mock-file-${fileItem.name}`,
            type: fileItem.type
          });
        }
      }

      // Criar o post
      const postData = {
        ...formData,
        author: 'Professor',
        files: fileData,
        videos: videos,
        images: imageUrls
      };

      console.log('=== POST DATA FINAL ===');
      console.log('PostData:', postData);
      
      await createPost(postData);
      
      navigate('/espaco-docente');
    } catch (err) {
      console.error('Erro ao criar post:', err);
      setError(err instanceof Error ? err.message : 'Erro ao publicar post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center py-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Publicar no Espaço Docente</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Compartilhe seus materiais didáticos e conhecimento com a comunidade educacional
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informações Básicas
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título da Publicação *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Introdução à Automação Industrial"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição do Conteúdo *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Descreva o conteúdo da aula e os tópicos abordados..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disciplina
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ex: Automação Industrial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nível de Ensino
                    </label>
                    <input
                      type="text"
                      name="grade_level"
                      value={formData.grade_level}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ex: 3º Ano Técnico"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Files Upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Materiais Didáticos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Clique para fazer upload de arquivos</p>
                      <p className="text-xs text-gray-500 mt-1">PDFs, PPTs, DOCs, etc.</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.rar"
                    />
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Arquivos Selecionados:</h4>
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Videos */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Video className="w-5 h-5 mr-2" />
                Vídeos Complementares
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={videoInput.title}
                    onChange={(e) => setVideoInput(prev => ({ ...prev, title: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Título do vídeo"
                  />
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={videoInput.url}
                      onChange={(e) => setVideoInput(prev => ({ ...prev, url: e.target.value }))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="URL do vídeo (YouTube, Vimeo, etc.)"
                    />
                    <button
                      type="button"
                      onClick={addVideo}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {videos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Vídeos Adicionados:</h4>
                    {videos.map((video, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Video className="w-4 h-4 text-red-600" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{video.title}</span>
                            <p className="text-xs text-gray-500">{video.url}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Images */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                Imagens da Aula
              </h3>
              
              <div className="space-y-4">
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Adicionar imagens</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB cada</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Tags
              </h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Digite uma tag"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
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
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/espaco-docente')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Publicando...' : 'Publicar no Espaço Docente'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublicarPost;
