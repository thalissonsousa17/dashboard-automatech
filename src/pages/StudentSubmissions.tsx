import React, { useState } from 'react';
import { useStudentSubmissions } from '../hooks/useStudentSubmissions';
import { 
  FolderOpen, 
  Plus, 
  Calendar,
  Users,
  FileText,
  Eye,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  User,
  Mail,
  Hash,
  Download,
  Brain,
  Star,
  MessageSquare,
  X
} from 'lucide-react';

const StudentSubmissions: React.FC = () => {
  const { folders, submissions, loading, createFolder, deleteFolder, evaluateSubmission } = useStudentSubmissions();
  
  console.log('=== PÁGINA TRABALHOS ALUNOS ===');
  console.log('Loading:', loading);
  console.log('Folders:', folders);
  console.log('Submissions:', submissions);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  
  const [newFolder, setNewFolder] = useState({
    name: '',
    class_name: '',
    assignment_theme: '',
    due_date: ''
  });

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newFolder.name.trim() || !newFolder.class_name.trim() || !newFolder.assignment_theme.trim() || !newFolder.due_date) {
      return;
    }

    try {
      await createFolder(newFolder);
      setNewFolder({ name: '', class_name: '', assignment_theme: '', due_date: '' });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (window.confirm(`⚠️ ATENÇÃO: Tem certeza que deseja excluir permanentemente a pasta "${folderName}"?\n\n🗑️ Esta ação NÃO pode ser desfeita!\n\n📁 Todos os trabalhos enviados para esta pasta também serão excluídos.\n\nDigite "EXCLUIR" para confirmar:`)) {
      try {
        await deleteFolder(folderId);
        if (selectedFolder === folderId) {
          setSelectedFolder(null);
        }
      } catch (error) {
        console.error('Erro ao excluir pasta:', error);
        alert('❌ Erro ao excluir pasta. Tente novamente.');
      }
    }
  };

  const copyShareLink = (shareLink: string) => {
    const fullLink = `${window.location.origin}/submit/${shareLink}`;
    console.log('Copiando link:', fullLink);
    console.log('Share link da pasta:', shareLink);
    navigator.clipboard.writeText(fullLink);
    setCopiedLink(shareLink);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleEvaluateSubmission = async (submissionId: string) => {
    setEvaluatingId(submissionId);
    try {
      await evaluateSubmission(submissionId);
    } catch (error) {
      console.error('Erro ao avaliar:', error);
    } finally {
      setEvaluatingId(null);
    }
  };

  // Função para simular download de trabalhos dos alunos
  const handleDownloadSubmission = (fileName: string, fileUrl: string) => {
    // Em produção, seria o URL real do arquivo
    // Por enquanto, vamos simular o download com um arquivo de exemplo
    const mockFileContent = `Trabalho do Aluno: ${fileName}\n\nEste é um arquivo de exemplo de trabalho acadêmico.\nEm produção, este seria o conteúdo real do arquivo PDF enviado pelo aluno.\n\nConteúdo simulado para demonstração da funcionalidade de download.`;
    
    // Criar blob com o conteúdo
    const blob = new Blob([mockFileContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    // Criar link temporário para download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    
    // Simular clique no link
    link.click();
    
    // Limpar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Feedback visual
    console.log(`Download iniciado: ${fileName}`);
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const selectedFolderData = folders.find(f => f.id === selectedFolder);
  const folderSubmissions = submissions.filter(s => s.folder_id === selectedFolder);

  if (loading) {
    console.log('Mostrando loading...');
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-48 border border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trabalhos dos Alunos</h1>
          <p className="text-gray-600">Gerencie pastas de entrega e avalie trabalhos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Pasta de Entrega</span>
        </button>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {folders.map((folder) => {
          const isExpired = new Date() > new Date(folder.due_date);
          const folderSubmissionCount = submissions.filter(s => s.folder_id === folder.id).length;
          
          return (
            <div key={folder.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{folder.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{folder.class_name}</p>
                  <p className="text-sm text-gray-500">{folder.assignment_theme}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {isExpired ? 'Expirado' : 'Ativo'}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  Prazo: {new Date(folder.due_date).toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  {folderSubmissionCount} trabalhos enviados
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Trabalhos
                </button>
                <button
                  onClick={() => copyShareLink(folder.share_link)}
                  className="bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 flex items-center justify-center"
                  title="Copiar link de envio"
                >
                  {copiedLink === folder.share_link ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Delete Button - Separate row for better visibility */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleDeleteFolder(folder.id, folder.name)}
                  className="w-full bg-red-50 text-red-700 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center justify-center text-sm font-medium transition-colors"
                  title="Excluir pasta permanentemente"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Pasta
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Nova Pasta de Entrega</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Pasta
                </label>
                <input
                  type="text"
                  value={newFolder.name}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Trabalho Final - Automação"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turma
                </label>
                <input
                  type="text"
                  value={newFolder.class_name}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, class_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 3º Ano - Técnico em Automação"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema do Trabalho
                </label>
                <input
                  type="text"
                  value={newFolder.assignment_theme}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, assignment_theme: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Sistemas de Automação Industrial"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Hora Limite
                </label>
                <input
                  type="datetime-local"
                  value={newFolder.due_date}
                  onChange={(e) => setNewFolder(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {selectedFolder && selectedFolderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedFolderData.name}</h2>
                  <p className="text-sm text-gray-600">{selectedFolderData.class_name}</p>
                </div>
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {folderSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum trabalho enviado</h3>
                  <p className="text-gray-500">Os trabalhos enviados pelos alunos aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folderSubmissions.map((submission) => (
                    <div key={submission.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <div className="flex items-center space-x-2">
                              <Hash className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{submission.student_registration}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{submission.student_name}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>{submission.student_email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(submission.submitted_at).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{submission.file_name}</span>
                            </div>
                            <span className="text-gray-500">{formatFileSize(submission.file_size)}</span>
                          </div>

                          {submission.ai_evaluation && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-2 mb-2">
                                <Brain className="w-4 h-4 text-purple-600" />
                                <span className="font-medium text-gray-900">Avaliação IA</span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">{submission.ai_evaluation.grammar_score}/10</div>
                                  <div className="text-xs text-gray-500">Gramática</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">{submission.ai_evaluation.coherence_score}/10</div>
                                  <div className="text-xs text-gray-500">Coerência</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-purple-600">{submission.ai_evaluation.suggested_grade}/10</div>
                                  <div className="text-xs text-gray-500">Nota Sugerida</div>
                                </div>
                              </div>
                              
                              <div className="text-sm">
                                <p className="font-medium text-gray-900 mb-1">Resumo:</p>
                                <p className="text-gray-700 mb-2">{submission.ai_evaluation.summary}</p>
                                <p className="font-medium text-gray-900 mb-1">Feedback:</p>
                                <p className="text-gray-700">{submission.ai_evaluation.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handleDownloadSubmission(submission.file_name, submission.file_url)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm flex items-center space-x-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar</span>
                          </button>
                          
                          {!submission.ai_evaluation && (
                            <button
                              onClick={() => handleEvaluateSubmission(submission.id)}
                              disabled={evaluatingId === submission.id}
                              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm flex items-center space-x-1 disabled:opacity-50"
                            >
                              <Brain className="w-3 h-3" />
                              <span>{evaluatingId === submission.id ? 'Avaliando...' : 'Avaliar IA'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma pasta criada</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira pasta de entrega para receber trabalhos dos alunos.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Criar Primeira Pasta
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;