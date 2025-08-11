import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeachingPosts } from '../hooks/useTeachingPosts';
import { 
  BookOpen,
  TrendingUp,
  Calendar,
  StickyNote,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  User,
  Eye,
  Heart
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { posts, loading: postsLoading } = useTeachingPosts();
  const [loading, setLoading] = useState(true);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => setLoading(false), 500);

    // Carregar notas do localStorage
    const savedNotes = localStorage.getItem('dashboardNotes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (err) {
        console.error('Erro ao carregar notas:', err);
      }
    }
  }, []);

  const saveNotes = (newNotes: Note[]) => {
    localStorage.setItem('dashboardNotes', JSON.stringify(newNotes));
    setNotes(newNotes);
  };

  const handleSaveNote = () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;

    if (editingNote) {
      // Editar nota existente
      const updatedNotes = notes.map(note =>
        note.id === editingNote.id
          ? { ...note, ...noteForm, updated_at: new Date().toISOString() }
          : note
      );
      saveNotes(updatedNotes);
      setEditingNote(null);
    } else {
      // Criar nova nota
      const newNote: Note = {
        id: Date.now().toString(),
        ...noteForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveNotes([newNote, ...notes]);
    }

    setNoteForm({ title: '', content: '' });
    setShowNoteForm(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, content: note.content });
    setShowNoteForm(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta anotação?')) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      saveNotes(updatedNotes);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-32 border border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  

  return (



    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral dos projetos e estatísticas do sistema</p>
      </div>




      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Recent Projects */}
        <div className="space-y-6">
          {/* Recent Teaching Posts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Publicações Recentes do Espaço Docente</h3>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            
            {postsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 py-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma publicação ainda</p>
                <button
                  onClick={() => navigate('/dashboard/publicar-post')}
                  className="text-green-600 hover:text-green-800 text-sm font-medium mt-2"
                >
                  Criar primeira publicação
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 cursor-pointer transition-colors"
                       onClick={() => navigate('/dashboard/espaco-docente')}>
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {post.subject} • {post.author}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center text-xs text-gray-400">
                          <Eye className="w-3 h-3 mr-1" />
                          {post.views}
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <Heart className="w-3 h-3 mr-1" />
                          {post.likes}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(post.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {posts.length > 5 && (
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate('/dashboard/espaco-docente')}
                      className="w-full text-center text-green-600 hover:text-green-800 text-sm font-medium py-2 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      Ver todas as {posts.length} publicações
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Categories and Notes */}
        <div className="space-y-6">
         
          {/* Notes Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <StickyNote className="w-5 h-5 mr-2 text-yellow-600" />
                Anotações
              </h3>
              <button
                onClick={() => {
                  setShowNoteForm(true);
                  setEditingNote(null);
                  setNoteForm({ title: '', content: '' });
                }}
                className="bg-yellow-50 text-yellow-700 p-2 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma anotação ainda</p>
                  <p className="text-gray-400 text-xs">Clique no + para criar uma</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{note.title}</h4>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed">{note.content}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(note.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Note Form Modal */}
            {showNoteForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
                      </h3>
                      <button
                        onClick={() => setShowNoteForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título
                      </label>
                      <input
                        type="text"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Título da anotação"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conteúdo
                      </label>
                      <textarea
                        value={noteForm.content}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Escreva sua anotação aqui..."
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setShowNoteForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveNote}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;