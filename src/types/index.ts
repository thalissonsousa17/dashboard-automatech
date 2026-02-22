export interface Config {
  id: string;
  webhook_url: string;
  bot_name: string;
  ai_test_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface StudentSubmission {
  id: string;
  folder_id: string;
  student_registration: string;
  student_name: string;
  student_email?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  submitted_at: string;
  ai_evaluation?: {
    summary: string;
    grammar_score: number;
    coherence_score: number;
    suggested_grade: number;
    feedback: string;
  };
}

export interface SubmissionFolder {
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

// =============================================
// MÓDULO DE GERAÇÃO DE PROVAS COM IA
// =============================================

export type QuestionType = 'multiple_choice' | 'essay' | 'mixed';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExamStatus = 'draft' | 'generated' | 'reviewed' | 'finalized';

export interface ExamAlternative {
  letter: string;
  text: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_number: number;
  question_type: 'multiple_choice' | 'essay';
  statement: string;
  alternatives: ExamAlternative[];
  correct_answer: string | null;
  explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  question_count: number;
  question_type: QuestionType;
  difficulty: Difficulty;
  reference_material: string | null;
  mixed_mc_count: number | null;
  mixed_essay_count: number | null;
  status: ExamStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  questions?: ExamQuestion[];
}

export interface ExamVersion {
  id: string;
  exam_id: string;
  version_label: string;
  question_order: number[];
  alternatives_order: Record<string, string[]>;
  qr_code_data: string | null;
  created_at: string;
}

export interface ExamAnswerKey {
  id: string;
  exam_id: string;
  version_id: string;
  answers: Record<string, string>;
  created_at: string;
}

export interface CreateExamInput {
  title: string;
  subject: string;
  question_count: number;
  question_type: QuestionType;
  difficulty: Difficulty;
  reference_material?: string;
  mixed_mc_count?: number;
  mixed_essay_count?: number;
  // Generation options (used for AI prompt only, not stored in DB)
  difficulty_levels?: Difficulty[];
  question_style?: 'contextualizada' | 'simples';
  mc_style?: 'contextualizada' | 'simples';
  essay_style?: 'contextualizada' | 'simples';
  mc_difficulty_levels?: Difficulty[];
  essay_difficulty_levels?: Difficulty[];
}