import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotes(data || []);
      console.log('✅ Notas carregadas do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar notas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
      
      // Fallback para localStorage se Supabase falhar
      const savedNotes = localStorage.getItem('dashboardNotes');
      if (savedNotes) {
        try {
          const parsedNotes = JSON.parse(savedNotes);
          setNotes(parsedNotes);
          console.log('📂 Notas carregadas do localStorage como fallback');
        } catch (parseErr) {
          console.error('❌ Erro ao carregar do localStorage:', parseErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: { title: string; content: string }) => {
    try {
      console.log('🆕 Criando nova nota:', noteData.title);

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: noteData.title,
          content: noteData.content
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newNote = data as Note;
      setNotes(prev => [newNote, ...prev]);
      
      // Também salvar no localStorage como backup
      const updatedNotes = [newNote, ...notes];
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      console.log('✅ Nota criada no Supabase:', newNote.id);
      return newNote;
    } catch (err) {
      console.error('❌ Erro ao criar nota:', err);
      
      // Fallback para localStorage se Supabase falhar
      const newNote: Note = {
        id: Date.now().toString(),
        ...noteData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      console.log('📂 Nota salva no localStorage como fallback');
      return newNote;
    }
  };

  const updateNote = async (noteId: string, noteData: { title: string; content: string }) => {
    try {
      console.log('✏️ Atualizando nota:', noteId);

      const { data, error } = await supabase
        .from('notes')
        .update({
          title: noteData.title,
          content: noteData.content
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      const updatedNote = data as Note;
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ));
      
      // Também atualizar localStorage
      const updatedNotes = notes.map(note => 
        note.id === noteId ? updatedNote : note
      );
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      console.log('✅ Nota atualizada no Supabase');
      return updatedNote;
    } catch (err) {
      console.error('❌ Erro ao atualizar nota:', err);
      
      // Fallback para localStorage
      const updatedNote = {
        ...notes.find(n => n.id === noteId),
        ...noteData,
        updated_at: new Date().toISOString()
      } as Note;
      
      const updatedNotes = notes.map(note => 
        note.id === noteId ? updatedNote : note
      );
      setNotes(updatedNotes);
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar nota');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      console.log('🗑️ Deletando nota:', noteId);

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      // Também remover do localStorage
      const updatedNotes = notes.filter(note => note.id !== noteId);
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      console.log('✅ Nota deletada do Supabase');
    } catch (err) {
      console.error('❌ Erro ao deletar nota:', err);
      
      // Fallback para localStorage
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem('dashboardNotes', JSON.stringify(updatedNotes));
      
      throw new Error(err instanceof Error ? err.message : 'Erro ao deletar nota');
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  };
};