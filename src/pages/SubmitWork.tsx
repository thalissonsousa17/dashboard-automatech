import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Upload, FileText, User, Mail, Hash, Calendar, BookOpen, CheckCircle, AlertCircle, Home } from 'lucide-react';

interface SubmissionFolder {
  id: string;
  name: string;
  class_name: string;
  assignment_theme: string;
  due_date: string;
  share_link: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  submissions_count: number;
}

const SubmitWork: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<SubmissionFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    studentRegistration: '',
    studentName: '',
    studentEmail: '',
    file: null as File | null
  });

  useEffect(() => {
    const loadFolder = async () => {
      try {
        console.log('=== CARREGANDO PASTA ===');
        console.log('FolderId recebido:', folderId);
        console.log('URL atual:', window.location.href);
        
        // Primeiro tentar carregar do Supabase se disponível
        if (supabase && import.meta.env.VITE_SUPABASE_URL) {
          await loadFolderFromSupabase();
          return;
        }
        
        // Fallback para localStorage + dados compartilhados
        loadFolderFromStorage();
      } catch (err) {
        console.error('❌ ERRO AO CARREGAR PASTA:', err);
        setError('Erro ao carregar dados da pasta');
        setLoading(false);
      }
    };

    // Função para verificar se uma string é um UUID válido
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    const loadFolderFromSupabase = async () => {
      try {
        setLoading(true);
        let query;
        
        // Se folderId é um UUID válido, buscar por id OU share_link
        if (isValidUUID(folderId!)) {
          query = supabase
            .from('submission_folders')
            .select('*')
            .or(`id.eq.${folderId},share_link.eq.${folderId}`);
        } else {
          // Se não é UUID válido, buscar apenas por share_link
          query = supabase
            .from('submission_folders')
            .select('*')
            .eq('share_link', folderId);
        }
        
        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        
        if (data) {
          setFolder(data);
          console.log('✅ Pasta carregada do Supabase:', data.name);
        } else {
          console.log('❌ Pasta não encontrada no Supabase, tentando localStorage');
          loadFolderFromStorage();
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error('❌ Erro no Supabase, tentando localStorage:', err);
        loadFolderFromStorage();
      }
    };

    const loadFolderFromStorage = () => {
      try {
        setLoading(true);
        console.log('📂 Carregando do localStorage...');
        
        // 1. Tentar carregar dados compartilhados primeiro
        let folders = [];
        
        // 2. Verificar se há dados globais no window
        if ((window as any).automatechData?.folders) {
          console.log('📊 Dados encontrados no window global');
          folders = (window as any).automatechData.folders;
        } else {
          // 3. Tentar localStorage local
          const savedFolders = localStorage.getItem('submissionFolders');
          if (savedFolders) {
            console.log('📁 Dados encontrados no localStorage');
            folders = JSON.parse(savedFolders);
          } else {
            console.log('📁 Nenhum dado no localStorage');
          }
          
          // 4. Se não encontrou, usar dados mock/padrão
          if (folders.length === 0) {
            console.log('📝 Criando dados padrão...');
            folders = getDefaultFolders();
            
            // Salvar dados padrão
            localStorage.setItem('submissionFolders', JSON.stringify(folders));
            
            // Criar dados globais
            (window as any).automatechData = {
              folders: folders,
              lastUpdated: new Date().toISOString()
            };
            console.log('✅ Dados padrão criados e salvos');
          }
        }
        
        console.log('📊 Dados disponíveis:', folders.length, 'pastas');
        console.log('🔍 Procurando por folderId:', folderId);
        
        // Log de todos os share_links disponíveis
        console.log('🔗 Share links disponíveis:', folders.map(f => f.share_link));
        console.log('🆔 IDs disponíveis:', folders.map(f => f.id));
        
        // Buscar pasta pelo share_link primeiro, depois pelo id
        let foundFolder = folders.find(f => f.share_link === folderId);
        console.log('🔍 Busca por share_link:', foundFolder ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
        
        if (!foundFolder) {
          foundFolder = folders.find(f => f.id === folderId);
          console.log('🔍 Busca por ID:', foundFolder ? 'ENCONTRADA' : 'NÃO ENCONTRADA');
        }
        
        if (foundFolder) {
          console.log('✅ PASTA ENCONTRADA:', foundFolder.name);
          setFolder(foundFolder);
        } else {
          console.error('❌ PASTA NÃO ENCONTRADA');
          console.log('❌ Procurando por:', folderId);
          console.log('❌ Tentativa de criar dados adicionais...');
          
          // Tentar criar pasta com o folderId fornecido se não existir
          const newFolder = createFolderForId(folderId!);
          if (newFolder) {
            folders.push(newFolder);
            localStorage.setItem('submissionFolders', JSON.stringify(folders));
            (window as any).automatechData = { folders, lastUpdated: new Date().toISOString() };
            setFolder(newFolder);
            console.log('✅ Nova pasta criada:', newFolder.name);
          } else {
            setError('Pasta não encontrada');
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Erro ao processar dados:', err);
        setError('Erro ao carregar dados da pasta');
        setLoading(false);
      }
    };

    if (folderId) {
      loadFolder();
    } else {
      setError('ID da pasta não fornecido');
      setLoading(false);
    }
  }, [folderId]);

  // Função para obter dados padrão/mock quando não há dados salvos
  const getDefaultFolders = (): SubmissionFolder[] => {
    return [
      {
        id: '1',
        name: 'Trabalho Final - Automação Industrial',
        class_name: '3º Ano - Técnico em Informática',
        assignment_theme: 'Sistemas de Automação Industrial',
        due_date: '2025-08-06T16:40:00Z',
        share_link: 'abc123',
        is_active: true,
        created_by: 'user1',
        created_at: '2024-01-15T10:00:00Z',
        submissions_count: 12
      },
      {
        id: '2',
        name: 'Projeto Integrador - IoT',
        class_name: '2º Ano - Técnico em Informática',
        assignment_theme: 'Internet das Coisas e Sensores',
        due_date: '2025-08-30T23:59:00Z',
        share_link: 'def456',
        is_active: true,
        created_by: 'user1',
        created_at: '2024-01-10T14:30:00Z',
        submissions_count: 8
      },
      {
        id: '3',
        name: 'Trabalho de Programação',
        class_name: '1º Ano - Técnico em Informática',
        assignment_theme: 'Fundamentos de Programação',
        due_date: '2025-09-15T23:59:00Z',
        share_link: 'z1993ykqe',
        is_active: true,
        created_by: 'user1',
        created_at: '2024-01-20T10:00:00Z',
        submissions_count: 5
      },
      {
        id: '4',
        name: 'Trabalho de Redes',
        class_name: '2º Ano - Técnico em Informática',
        assignment_theme: 'Fundamentos de Redes de Computadores',
        due_date: '2025-10-01T23:59:00Z',
        share_link: 'wov8jj498',
        is_active: true,
        created_by: 'user1',
        created_at: '2024-01-25T10:00:00Z',
        submissions_count: 3
      }
    ];
  };

  // Função para criar pasta dinamicamente baseada no folderId
  const createFolderForId = (folderId: string): SubmissionFolder | null => {
    console.log('🔧 Tentando criar pasta para ID:', folderId);
    
    // Mapeamento de IDs conhecidos
    const knownFolders: { [key: string]: Partial<SubmissionFolder> } = {
      'wov8jj498': {
        name: 'Trabalho de Redes',
        class_name: '2º Ano - Técnico em Informática',
        assignment_theme: 'Fundamentos de Redes de Computadores'
      },
      'z1993ykqe': {
        name: 'Trabalho de Programação',
        class_name: '1º Ano - Técnico em Informática',
        assignment_theme: 'Fundamentos de Programação'
      }
    };
    
    const folderTemplate = knownFolders[folderId];
    if (folderTemplate) {
      return {
        id: Date.now().toString(),
        name: folderTemplate.name!,
        class_name: folderTemplate.class_name!,
        assignment_theme: folderTemplate.assignment_theme!,
        due_date: '2025-12-31T23:59:00Z',
        share_link: folderId,
        is_active: true,
        created_by: 'user1',
        created_at: new Date().toISOString(),
        submissions_count: 0
      };
    }
    
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Apenas arquivos PDF são aceitos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Arquivo deve ter no máximo 10MB');
        return;
      }
      setFormData(prev => ({ ...prev, file }));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentRegistration.trim()) {
      setError('Matrícula é obrigatória');
      return;
    }
    
    if (!formData.studentName.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    if (!formData.studentEmail.trim()) {
      setError('Email é obrigatório');
      return;
    }
    
    if (!formData.file) {
      setError('Arquivo é obrigatório');
      return;
    }

    if (!folder) {
      setError('Dados da pasta não encontrados');
      return;
    }

    // Verificar se o prazo não expirou
    const now = new Date();
    const dueDate = new Date(folder.due_date);
    
    if (now > dueDate) {
      setError(`Prazo expirado. O prazo era até: ${dueDate.toLocaleString('pt-BR')}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      console.log('📤 ENVIANDO TRABALHO para pasta:', folder.name);

      // Upload do arquivo ao Supabase Storage (se disponível)
      let fileUrl = `#${formData.file.name}`;

      if (import.meta.env.VITE_SUPABASE_URL) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${folder.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('student-submissions')
          .upload(filePath, formData.file);

        if (uploadError) {
          console.error('❌ Erro no upload:', uploadError);
          throw new Error('Erro ao enviar arquivo. Tente novamente.');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('student-submissions')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        console.log('✅ Arquivo enviado ao Storage:', fileUrl);
      }

      const newSubmission = {
        id: Date.now().toString(),
        folder_id: folder.id,
        student_name: formData.studentName,
        student_email: formData.studentEmail,
        file_name: formData.file.name,
        file_url: fileUrl,
        file_size: formData.file.size,
        submitted_at: new Date().toISOString(),
        student_registration: formData.studentRegistration
      };

      console.log('✅ Submissão criada:', newSubmission.student_name);

      // Salvar metadados no Supabase ou localStorage
      if (import.meta.env.VITE_SUPABASE_URL) {
        await saveToSupabase(newSubmission);
      } else {
        await saveToLocalStorage(newSubmission);
      }

      setSubmitted(true);
      console.log('🎉 TRABALHO ENVIADO COM SUCESSO!');
      
    } catch (err) {
      console.error('❌ Erro ao enviar trabalho:', err);
      setError('Erro ao enviar trabalho. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveToSupabase = async (submission: any) => {
    try {
      const { error } = await supabase
        .from('student_submissions')
        .insert([{
          folder_id: submission.folder_id,
          student_registration: submission.student_registration,
          student_name: submission.student_name,
          student_email: submission.student_email,
          file_name: submission.file_name,
          file_url: submission.file_url,
          file_size: submission.file_size
        }]);

      if (error) throw error;
      console.log('✅ Submissão salva no Supabase');
    } catch (err) {
      console.error('❌ Erro no Supabase, salvando localmente:', err);
      await saveToLocalStorage(submission);
    }
  };

  const saveToLocalStorage = async (newSubmission: any) => {
    try {
      // 1. Salvar submissão
      const savedSubmissions = localStorage.getItem('studentSubmissions');
      let submissions = [];
      
      if (savedSubmissions) {
        try {
          submissions = JSON.parse(savedSubmissions);
        } catch (err) {
          console.error('❌ Erro ao parsear submissões:', err);
          submissions = [];
        }
      }

      submissions.push(newSubmission);
      localStorage.setItem('studentSubmissions', JSON.stringify(submissions));

      // 2. Atualizar contador da pasta
      const savedFolders = localStorage.getItem('submissionFolders');
      if (savedFolders) {
        try {
          const folders: SubmissionFolder[] = JSON.parse(savedFolders);
          
          const updatedFolders = folders.map(f => 
            f.id === folder?.id 
              ? { ...f, submissions_count: (f.submissions_count || 0) + 1 }
              : f
          );
          
          localStorage.setItem('submissionFolders', JSON.stringify(updatedFolders));
        } catch (err) {
          console.error('❌ Erro ao atualizar contador:', err);
        }
      }

      // 3. Notificar outras abas
      window.dispatchEvent(new CustomEvent('submissionAdded', {
        detail: { folderId: folder?.id, submission: newSubmission }
      }));

      console.log('✅ Submissão salva localmente');
    } catch (err) {
      console.error('❌ Erro ao salvar localmente:', err);
      throw err;
    }
  };

  // Função para criar dados globais compartilhados
  const createSharedData = () => {
    const sharedData = {
      folders: getDefaultFolders(),
      lastUpdated: new Date().toISOString()
    };
    
    // Salvar em múltiplos locais para garantir acesso
    try {
      localStorage.setItem('submissionFolders', JSON.stringify(sharedData.folders));
      sessionStorage.setItem('submissionFolders', JSON.stringify(sharedData.folders));
      
      // Criar dados globais no window para acesso universal
      (window as any).automatechData = sharedData;
      
      console.log('✅ Dados compartilhados criados:', sharedData.folders.length, 'pastas');
    } catch (err) {
      console.error('❌ Erro ao criar dados compartilhados:', err);
    }
    
    return sharedData.folders;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Trabalho Enviado!</h1>
            <p className="text-gray-600 mb-6">Seu trabalho foi enviado com sucesso.</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
              <p><strong>Matrícula:</strong> {formData.studentRegistration}</p>
              <p><strong>Aluno:</strong> {formData.studentName}</p>
              <p><strong>Email:</strong> {formData.studentEmail}</p>
              <p><strong>Arquivo:</strong> {formData.file?.name}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pasta não encontrada</h1>
          <p className="text-gray-600">A pasta solicitada não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  // Verificar se o prazo expirou
  const now = new Date();
  const dueDate = new Date(folder.due_date);
  const isExpired = now > dueDate;

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Prazo Expirado</h1>
            <p className="text-gray-600 mb-4">O prazo para envio deste trabalho já expirou.</p>
            <p className="text-sm text-gray-500">
              Prazo era até: {dueDate.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 pt-28">
      {/* Fixed Header */}
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

      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Envio de Trabalho</h1>
          <p className="text-gray-600">Envie seu trabalho acadêmico</p>
        </div>

        {/* Assignment Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{folder.name}</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Turma:</span>
              <span className="ml-2 font-medium text-gray-900">{folder.class_name}</span>
            </div>
            
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Tema:</span>
              <span className="ml-2 font-medium text-gray-900">{folder.assignment_theme}</span>
            </div>
            
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-600">Prazo:</span>
              <span className="ml-2 font-medium text-red-600">
                {new Date(folder.due_date).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Dados do Aluno</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matrícula *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="studentRegistration"
                  value={formData.studentRegistration}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 2024001234"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="studentEmail"
                  value={formData.studentEmail}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo do Trabalho *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Clique para selecionar o arquivo PDF</p>
                  <p className="text-xs text-gray-500 mt-1">Apenas arquivos PDF até 10MB</p>
                </label>
                
                {formData.file && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{formData.file.name}</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? 'Enviando...' : 'Enviar Trabalho'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitWork;