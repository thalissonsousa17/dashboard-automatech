import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      setNotes(data || []);
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar notas");

      // Fallback localStorage se Supabase falhar
      const saved = localStorage.getItem(`notes_${user.id}`);
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch {
          // ignore parse errors
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (noteData: { title: string; content: string }) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: noteData.title,
          content: noteData.content,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote = data as Note;
      setNotes((prev) => {
        const updated = [newNote, ...prev];
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      return newNote;
    } catch (err) {
      console.error("Erro ao criar nota:", err);

      // Fallback localStorage
      const newNote: Note = {
        id: `local_${Date.now()}`,
        ...noteData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setNotes((prev) => {
        const updated = [newNote, ...prev];
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      return newNote;
    }
  };

  const updateNote = async (
    noteId: string,
    noteData: { title: string; content: string },
  ) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { data, error } = await supabase
        .from("notes")
        .update({
          title: noteData.title,
          content: noteData.content,
        })
        .eq("id", noteId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const updatedNote = data as Note;
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === noteId ? updatedNote : n));
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      return updatedNote;
    } catch (err) {
      console.error("Erro ao atualizar nota:", err);

      // Fallback localStorage
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === noteId
            ? { ...n, ...noteData, updated_at: new Date().toISOString() }
            : n,
        );
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });

      throw err;
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotes((prev) => {
        const updated = prev.filter((n) => n.id !== noteId);
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Erro ao deletar nota:", err);

      // Fallback localStorage
      setNotes((prev) => {
        const updated = prev.filter((n) => n.id !== noteId);
        localStorage.setItem(`notes_${user.id}`, JSON.stringify(updated));
        return updated;
      });

      throw err;
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
};
