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