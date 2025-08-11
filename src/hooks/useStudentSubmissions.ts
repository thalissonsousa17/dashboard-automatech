import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { openAIService } from '../lib/openai';
import { SubmissionFolder, StudentSubmission } from '../types';

// Mock data para demonstração
export const mockFolders: SubmissionFolder[] = [
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
  }
];

export const mockSubmissions: StudentSubmission[] = [
  {
    id: '1',
    folder_id: '1',
    student_registration: '2024001234',
    student_name: 'João Silva',
    student_email: 'joao.silva@email.com',
    file_name: 'trabalho_automacao_joao.pdf',
    file_url: 'https://example.com/file1.pdf',
    file_size: 2048000,
    submitted_at: '2024-02-10T15:30:00Z',
    ai_evaluation: {
      summary: 'Trabalho bem estruturado sobre automação industrial, abordando conceitos fundamentais e aplicações práticas.',
      grammar_score: 8,
      coherence_score: 9,
      suggested_grade: 8.5,
      feedback: 'Excelente trabalho! Demonstra boa compreensão dos conceitos. Recomendo aprofundar a seção sobre sensores.'
    }
  },
  {
    id: '2',
    folder_id: '1',
    student_registration: '2024005678',
    student_name: 'Maria Santos',
    student_email: 'maria.santos@email.com',
    file_name: 'projeto_maria_automacao.pdf',
    file_url: 'https://example.com/file2.pdf',
    file_size: 1536000,
    submitted_at: '2024-02-12T09:15:00Z'
  },
  {
    id: '3',
    folder_id: '2',
    student_registration: '2024009012',
    student_name: 'Pedro Costa',
    student_email: 'pedro.costa@email.com',
    file_name: 'iot_projeto_pedro.pdf',
    file_url: 'https://example.com/file3.pdf',
    file_size: 3072000,
    submitted_at: '2024-01-28T20:45:00Z'
  }
];

export const useStudentSubmissions = () => {
  const [folders, setFolders] = useState<SubmissionFolder[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Salvar pastas no localStorage
  const saveFolders = (newFolders: SubmissionFolder[]) => {
    console.log('🔄 SALVANDO PASTAS:', newFolders.length, 'pastas');
    localStorage.setItem('submissionFolders', JSON.stringify(newFolders));
    setFolders(newFolders);
    console.log('✅ Pastas salvas com sucesso');
  };

  // Salvar submissões no localStorage
  const saveSubmissions = (newSubmissions: StudentSubmission[]) => {
    console.log('🔄 SALVANDO SUBMISSÕES:', newSubmissions.length, 'submissões');
    localStorage.setItem('studentSubmissions', JSON.stringify(newSubmissions));
    setSubmissions(newSubmissions);
    console.log('✅ Submissões salvas com sucesso');
  };

  const fetchData = async () => {
    console.log('🔄 CARREGANDO DADOS...');
    
    if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
      loadFromLocalStorage();
      setLoading(false);
      console.log('✅ CARREGAMENTO CONCLUÍDO');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar pastas
      const { data: foldersData, error: foldersError } = await supabase
        .from('submission_folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (foldersError) throw foldersError;

      // Buscar submissões
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('student_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setFolders(foldersData || []);
      setSubmissions(submissionsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    // Carregar dados do localStorage ou usar mock inicial
    const savedFolders = localStorage.getItem('submissionFolders');
    const savedSubmissions = localStorage.getItem('studentSubmissions');
    
    console.log('📂 Dados no localStorage - Pastas:', !!savedFolders, 'Submissões:', !!savedSubmissions);
    
    if (savedFolders) {
      try {
        const parsedFolders = JSON.parse(savedFolders);
        console.log('✅ Pastas carregadas:', parsedFolders.length);
        setFolders(parsedFolders);
      } catch (err) {
        console.error('❌ Erro ao carregar pastas:', err);
        setFolders(mockFolders);
        saveFolders(mockFolders);
      }
    } else {
      console.log('📝 Usando dados mock iniciais');
      setFolders(mockFolders);
      saveFolders(mockFolders);
    }
    
    if (savedSubmissions) {
      try {
        const parsedSubmissions = JSON.parse(savedSubmissions);
        console.log('✅ Submissões carregadas:', parsedSubmissions.length);
        setSubmissions(parsedSubmissions);
      } catch (err) {
        console.error('❌ Erro ao carregar submissões:', err);
        setSubmissions(mockSubmissions);
        saveSubmissions(mockSubmissions);
      }
    } else {
      console.log('📝 Usando submissões mock iniciais');
      setSubmissions(mockSubmissions);
      saveSubmissions(mockSubmissions);
    }
  };

  const createFolder = async (folderData: Omit<SubmissionFolder, 'id' | 'share_link' | 'is_active' | 'created_by' | 'created_at' | 'submissions_count'>) => {
    try {
      const shareId = Math.random().toString(36).substring(2, 15);
      console.log('🆕 Criando pasta com share_link:', shareId);
      
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Simular criação em modo mock
        const newFolder: SubmissionFolder = {
          ...folderData,
          id: Date.now().toString(),
          share_link: shareId,
          is_active: new Date(folderData.due_date) > new Date(),
          created_by: 'user1',
          created_at: new Date().toISOString(),
          submissions_count: 0
        };
        console.log('✅ Nova pasta criada:', newFolder.name, 'ID:', newFolder.id);
        const updatedFolders = [newFolder, ...folders];
        saveFolders(updatedFolders);
        
        // Salvar também em dados globais para acesso universal
        try {
          sessionStorage.setItem('submissionFolders', JSON.stringify(updatedFolders));
          (window as any).automatechData = {
            folders: updatedFolders,
            lastUpdated: new Date().toISOString()
          };
          console.log('✅ Dados globais atualizados para acesso universal');
        } catch (err) {
          console.error('❌ Erro ao salvar dados globais:', err);
        }
        
        return newFolder;
      }

      const { data, error } = await supabase
        .from('submission_folders')
        .insert([{
          ...folderData,
          share_link: shareId,
          is_active: new Date(folderData.due_date) > new Date()
        }])
        .select()
        .single();

      if (error) throw error;
      const updatedFolders = [data, ...folders];
      saveFolders(updatedFolders);
      return data;
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      // Simular criação em modo mock
      const shareId = Math.random().toString(36).substr(2, 9);
      const newFolder: SubmissionFolder = {
        ...folderData,
        id: Date.now().toString(),
        share_link: shareId,
        is_active: new Date(folderData.due_date) > new Date(),
        created_by: 'user1',
        created_at: new Date().toISOString(),
        submissions_count: 0
      };
      const updatedFolders = [newFolder, ...folders];
      saveFolders(updatedFolders);
      return newFolder;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      console.log('🗑️ DELETANDO PASTA:', folderId);
      
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Simular exclusão em modo mock
        const updatedFolders = folders.filter(folder => folder.id !== folderId);
        const updatedSubmissions = submissions.filter(submission => submission.folder_id !== folderId);
        
        console.log('✅ Exclusão concluída - Pastas restantes:', updatedFolders.length);
        
        saveFolders(updatedFolders);
        saveSubmissions(updatedSubmissions);
        
        // Mostrar confirmação de exclusão
        console.log('🗑️ Pasta excluída permanentemente');
        return;
      }

      const { error } = await supabase
        .from('submission_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      
      const updatedFolders = folders.filter(folder => folder.id !== folderId);
      const updatedSubmissions = submissions.filter(submission => submission.folder_id !== folderId);
      saveFolders(updatedFolders);
      saveSubmissions(updatedSubmissions);
      
      console.log('✅ Pasta excluída do Supabase e localStorage');
    } catch (err) {
      console.error('Erro ao excluir pasta:', err);
      // Simular exclusão em modo mock mesmo com erro
      const updatedFolders = folders.filter(folder => folder.id !== folderId);
      const updatedSubmissions = submissions.filter(submission => submission.folder_id !== folderId);
      saveFolders(updatedFolders);
      saveSubmissions(updatedSubmissions);
      throw err; // Re-throw para mostrar erro na UI
    }
  };

  const evaluateSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      const folder = folders.find(f => f.id === submission.folder_id);
      const theme = folder?.assignment_theme || 'Trabalho acadêmico';

      // Simular conteúdo do PDF para avaliação
      const mockPdfContent = `
        Este é um trabalho sobre ${theme}. 
        O trabalho aborda os principais conceitos e apresenta uma análise detalhada do tema.
        Inclui exemplos práticos e demonstra compreensão dos fundamentos teóricos.
      `;

      const evaluation = await openAIService.evaluatePDF(mockPdfContent, theme);

      // Atualizar submissão com avaliação
      setSubmissions(prev => prev.map(s => 
        s.id === submissionId 
          ? { ...s, ai_evaluation: evaluation }
          : s
      ));

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        await supabase
          .from('student_submissions')
          .update({ ai_evaluation: evaluation })
          .eq('id', submissionId);
      }

      return evaluation;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao avaliar arquivo');
    }
  };

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  useEffect(() => {
    fetchData();
    
    // Event listener mais específico e controlado
    const handleStorageChange = (e: StorageEvent) => {      
      // Só reagir a mudanças externas (outras abas)
      if (e.key === 'submissionFolders' && e.newValue && e.oldValue !== e.newValue) {
        console.log('📡 Detectada mudança externa nas pastas');
        try {
          const newFolders = JSON.parse(e.newValue);
          setFolders(newFolders);
          console.log('✅ Pastas atualizadas:', newFolders.length);
        } catch (err) {
          console.error('❌ Erro ao processar mudança:', err);
        }
      }
      
      if (e.key === 'studentSubmissions' && e.newValue && e.oldValue !== e.newValue) {
        console.log('📡 Detectada mudança externa nas submissões');
        try {
          const newSubmissions = JSON.parse(e.newValue);
          setSubmissions(newSubmissions);
          console.log('✅ Submissões atualizadas:', newSubmissions.length);
        } catch (err) {
          console.error('❌ Erro ao processar mudança:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Event listener para atualizações internas
    const handleCustomEvent = () => {
      console.log('🔄 Recarregando dados por evento customizado');
      fetchData();
    };
    
    window.addEventListener('submissionAdded', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('submissionAdded', handleCustomEvent);
    };
  }, []);

  return {
    folders,
    submissions,
    loading,
    error,
    createFolder,
    deleteFolder,
    evaluateSubmission,
    fetchData,
  };
};