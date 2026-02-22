export interface ExamEditedContent {
  id: string;
  exam_id: string;
  content_json: Record<string, unknown> | null;
  content_html: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
}
