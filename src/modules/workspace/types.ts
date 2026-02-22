export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamFolder {
  id: string;
  name: string;
  workspace_id: string;
  parent_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FolderNode extends ExamFolder {
  children: FolderNode[];
  exam_count: number;
}

export interface FolderPathItem {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
}
