import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Document {
  id: string;
  title: string;
  content_json: Record<string, unknown> | null;
  content_html: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('documents')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as Document[]) || []);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createDocument = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const { data, error } = await db
        .from('documents')
        .insert({ created_by: user.id, title: 'Documento sem título' })
        .select('id')
        .single();

      if (error) throw error;
      return (data as { id: string }).id;
    } catch (err) {
      console.error('Erro ao criar documento:', err);
      return null;
    }
  }, [user]);

  const saveDocument = useCallback(async (
    id: string,
    json: Record<string, unknown>,
    html: string,
    title: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await db
        .from('documents')
        .update({ content_json: json, content_html: html, title })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erro ao salvar documento:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await db.from('documents').delete().eq('id', id);
      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      console.error('Erro ao deletar documento:', err);
      return false;
    }
  }, []);

  const loadDocument = useCallback(async (id: string): Promise<Document | null> => {
    try {
      const { data, error } = await db
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Document;
    } catch (err) {
      console.error('Erro ao carregar documento:', err);
      return null;
    }
  }, []);

  return {
    documents,
    loading,
    saving,
    fetchDocuments,
    createDocument,
    saveDocument,
    deleteDocument,
    loadDocument,
  };
}
