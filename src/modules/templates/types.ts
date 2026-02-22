import type { ExamQuestion, QuestionType, Difficulty } from '../../types';

export interface ExamTemplate {
  id: string;
  name: string;
  description: string | null;
  source_exam_id: string | null;
  subject: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  question_count: number;
  mixed_mc_count: number | null;
  mixed_essay_count: number | null;
  reference_material: string | null;
  questions_snapshot: ExamQuestion[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}
