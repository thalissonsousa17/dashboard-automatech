import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeachingPosts } from '../hooks/useTeachingPosts';
import { useNotes } from '../hooks/useNotes';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Note } from '../hooks/useNotes';
import StatsCard from '../components/Dashboard/StatsCard';
import {
  BookOpen,
  Calendar,
  StickyNote,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Eye,
  Heart,
  Brain,
  FolderOpen,
  FileEdit,
  Globe,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const quickActions = [
  {
    label: 'Gerar Prova IA',
    icon: Brain,
    to: '/dashboard/gerador-provas',
    color: 'from-blue-600 to-blue-700',
  },
  {
    label: 'Publicar Material',
    icon: Globe,
    to: '/dashboard/publicar-post',
    color: 'from-green-600 to-green-700',
  },
  {
    label: 'Minhas Provas',
    icon: FolderOpen,
    to: '/dashboard/workspaces',
    color: 'from-purple-600 to-purple-700',
  },
  {
    label: 'Novo Documento',
    icon: FileEdit,
    to: '/dashboard/documents',
    color: 'from-orange-500 to-orange-600',
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { posts, loading: postsLoading } = useTeachingPosts();
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes();

  // Remote stats
  const [examCount, setExamCount] = useState(0);
  const [wsCount, setWsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Notes state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const [examsRes, wsRes] = await Promise.all([
          db
            .from('exams')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', user.id),
          db
            .from('exam_workspaces')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', user.id),
        ]);
        setExamCount(examsRes.count ?? 0);
        setWsCount(wsRes.count ?? 0);
      } catch {
        // silently fail — not critical
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const openNewNote = () => {
    setEditingNote(null);
    setNoteForm({ title: '', content: '' });
    setShowNoteForm(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    try {
      if (editingNote) {
        await updateNote(editingNote.id, noteForm);
        setEditingNote(null);
      } else {
        await createNote(noteForm);
      }
      setNoteForm({ title: '', content: '' });
      setShowNoteForm(false);
    } catch {
      // hook handles fallback to localStorage
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, content: note.content });
    setShowNoteForm(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await deleteNote(noteId);
    } catch {
      // hook handles fallback
    } finally {
      setDeletingNoteId(null);
    }
  };

  const firstName =
    profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Professor';

  if (notesLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-blue-100 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-64 border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Greeting Banner ── */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-sm">
        <h1 className="text-2xl font-bold mb-1">
          {getGreeting()}, {firstName}!
        </h1>
        <p className="text-blue-100 text-sm">
          Aqui está um resumo da sua plataforma de ensino.
        </p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Provas"
          value={statsLoading ? '—' : examCount}
          icon={Brain as React.FC<React.SVGProps<SVGSVGElement>>}
          color="blue"
        />
        <StatsCard
          title="Publicações"
          value={posts.length}
          icon={BookOpen as React.FC<React.SVGProps<SVGSVGElement>>}
          color="green"
        />
        <StatsCard
          title="Anotações"
          value={notes.length}
          icon={StickyNote as React.FC<React.SVGProps<SVGSVGElement>>}
          color="orange"
        />
        <StatsCard
          title="Workspaces"
          value={statsLoading ? '—' : wsCount}
          icon={FolderOpen as React.FC<React.SVGProps<SVGSVGElement>>}
          color="purple"
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-gradient-to-br ${action.color} text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">Publicações Recentes</h3>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>

          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-2">Nenhuma publicação ainda</p>
              <button
                onClick={() => navigate('/dashboard/publicar-post')}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Criar primeira publicação →
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {posts.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-start space-x-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate('/dashboard/espaco-docente')}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.subject} • {post.author}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center text-xs text-gray-400">
                        <Eye className="w-3 h-3 mr-0.5" />
                        {post.views}
                      </span>
                      <span className="flex items-center text-xs text-gray-400">
                        <Heart className="w-3 h-3 mr-0.5" />
                        {post.likes}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {posts.length > 5 && (
                <button
                  onClick={() => navigate('/dashboard/espaco-docente')}
                  className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium py-2 hover:bg-green-50 rounded-lg transition-colors mt-1"
                >
                  Ver todas as {posts.length} publicações →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-yellow-500" />
              Anotações
            </h3>
            <button
              onClick={openNewNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
            {notes.length === 0 ? (
              <div className="text-center py-10">
                <StickyNote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma anotação ainda</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Clique em &ldquo;Nova&rdquo; para criar uma
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm leading-snug">
                      {note.title}
                    </h4>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 text-xs leading-relaxed line-clamp-3">
                    {note.content}
                  </p>
                  <p className="text-gray-400 text-xs mt-1.5">
                    {new Date(note.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Note Form Modal ── */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
              </h3>
              <button
                onClick={() => setShowNoteForm(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) =>
                    setNoteForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none"
                  placeholder="Título da anotação"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Conteúdo
                </label>
                <textarea
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none"
                  placeholder="Escreva sua anotação aqui..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowNoteForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!noteForm.title.trim() || !noteForm.content.trim()}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
