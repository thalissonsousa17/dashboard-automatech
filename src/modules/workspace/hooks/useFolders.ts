import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { ExamFolder, FolderNode, FolderPathItem } from '../types';
import type { Exam } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function buildFolderTree(
  folders: ExamFolder[],
  countMap?: Map<string, number>,
): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach((f) =>
    map.set(f.id, {
      ...f,
      children: [],
      exam_count: countMap?.get(f.id) ?? 0,
    }),
  );

  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => a.sort_order - b.sort_order);
  const sortChildren = (nodes: FolderNode[]) => {
    nodes.forEach((n) => {
      n.children.sort((a, b) => a.sort_order - b.sort_order);
      sortChildren(n.children);
    });
  };
  sortChildren(roots);

  return roots;
}

export const useFolders = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Persiste o mapa de contagem entre re-renders sem causar re-render extra
  const examCountsRef = useRef<Map<string, number>>(new Map());

  const fetchFolders = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      try {
        setLoading(true);

        // Buscar pastas
        const { data, error } = await db
          .from('exam_folders')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('created_by', user.id)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const folderList = (data as ExamFolder[]) || [];

        // Buscar contagem de provas por pasta
        const { data: examData } = await db
          .from('exams')
          .select('folder_id')
          .eq('workspace_id', workspaceId)
          .eq('created_by', user.id)
          .not('folder_id', 'is', null);

        const countMap = new Map<string, number>();
        if (examData) {
          (examData as { folder_id: string }[]).forEach((e) => {
            countMap.set(e.folder_id, (countMap.get(e.folder_id) ?? 0) + 1);
          });
        }
        examCountsRef.current = countMap;

        setFolders(folderList);
        setFolderTree(buildFolderTree(folderList, countMap));
      } catch (err) {
        console.error('Erro ao carregar pastas:', err);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const createFolder = async (
    name: string,
    workspaceId: string,
    parentId?: string,
  ): Promise<ExamFolder | null> => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await db
      .from('exam_folders')
      .insert({
        name,
        workspace_id: workspaceId,
        parent_id: parentId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const folder = data as ExamFolder;
    const updatedFolders = [...folders, folder];
    setFolders(updatedFolders);
    setFolderTree(buildFolderTree(updatedFolders, examCountsRef.current));
    return folder;
  };

  const renameFolder = async (id: string, name: string) => {
    const { error } = await db
      .from('exam_folders')
      .update({ name })
      .eq('id', id);

    if (error) throw error;

    const updatedFolders = folders.map((f) =>
      f.id === id ? { ...f, name } : f,
    );
    setFolders(updatedFolders);
    setFolderTree(buildFolderTree(updatedFolders, examCountsRef.current));
  };

  const deleteFolder = async (id: string) => {
    const { error } = await db
      .from('exam_folders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    examCountsRef.current.delete(id);
    const updatedFolders = folders.filter((f) => f.id !== id);
    setFolders(updatedFolders);
    setFolderTree(buildFolderTree(updatedFolders, examCountsRef.current));
  };

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    const { error } = await db
      .from('exam_folders')
      .update({ parent_id: newParentId })
      .eq('id', folderId);

    if (error) throw error;

    const updatedFolders = folders.map((f) =>
      f.id === folderId ? { ...f, parent_id: newParentId } : f,
    );
    setFolders(updatedFolders);
    setFolderTree(buildFolderTree(updatedFolders, examCountsRef.current));
  };

  const moveExamToFolder = async (
    examId: string,
    folderId: string | null,
    workspaceId?: string | null,
  ) => {
    const updates: Record<string, unknown> = { folder_id: folderId };
    if (workspaceId !== undefined) {
      updates.workspace_id = workspaceId;
    }

    const { error } = await db
      .from('exams')
      .update(updates)
      .eq('id', examId);

    if (error) throw error;

    // Atualiza contagem local imediatamente
    if (folderId) {
      examCountsRef.current.set(
        folderId,
        (examCountsRef.current.get(folderId) ?? 0) + 1,
      );
      setFolderTree(buildFolderTree(folders, examCountsRef.current));
    }
  };

  const fetchFolderPath = useCallback(
    async (folderId: string): Promise<FolderPathItem[]> => {
      try {
        const { data, error } = await db.rpc('get_folder_path', {
          folder_uuid: folderId,
        });

        if (error) throw error;
        return (data as FolderPathItem[]) || [];
      } catch {
        // Fallback: build path client-side
        const path: FolderPathItem[] = [];
        let currentId: string | null = folderId;
        let depth = 0;

        while (currentId) {
          const folder = folders.find((f) => f.id === currentId);
          if (!folder) break;
          path.unshift({
            id: folder.id,
            name: folder.name,
            parent_id: folder.parent_id,
            depth,
          });
          currentId = folder.parent_id;
          depth++;
        }
        return path;
      }
    },
    [folders],
  );

  const getExamsInFolder = useCallback(
    async (folderId: string | null, workspaceId: string): Promise<Exam[]> => {
      if (!user) return [];

      let query = db
        .from('exams')
        .select('*')
        .eq('created_by', user.id)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Exam[]) || [];
    },
    [user],
  );

  const getUnfiledExams = useCallback(async (): Promise<Exam[]> => {
    if (!user) return [];

    const { data, error } = await db
      .from('exams')
      .select('*')
      .eq('created_by', user.id)
      .is('workspace_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Exam[]) || [];
  }, [user]);

  return {
    folders,
    folderTree,
    loading,
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    moveExamToFolder,
    fetchFolderPath,
    getExamsInFolder,
    getUnfiledExams,
  };
};
