import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { Workspace } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useWorkspaces = () => {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await db
        .from('exam_workspaces')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkspaces((data as Workspace[]) || []);
    } catch (err) {
      console.error('Erro ao carregar workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchWorkspaces();
  }, [authLoading, fetchWorkspaces]);

  const createWorkspace = async (
    name: string,
    description?: string,
    color?: string,
  ): Promise<Workspace | null> => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await db
      .from('exam_workspaces')
      .insert({
        name,
        description: description || null,
        color: color || '#3B82F6',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const workspace = data as Workspace;
    setWorkspaces((prev) => [workspace, ...prev]);
    return workspace;
  };

  const updateWorkspace = async (
    id: string,
    updates: Partial<Pick<Workspace, 'name' | 'description' | 'color'>>,
  ) => {
    const { error } = await db
      .from('exam_workspaces')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    );
  };

  const deleteWorkspace = async (id: string) => {
    const { error } = await db
      .from('exam_workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  };

  return {
    workspaces,
    loading,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
};
