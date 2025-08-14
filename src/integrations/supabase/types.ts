export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      config: {
        Row: {
          ai_test_enabled: boolean | null
          bot_name: string | null
          created_at: string
          id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          ai_test_enabled?: boolean | null
          bot_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          ai_test_enabled?: boolean | null
          bot_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean | null
          role: string | null
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean | null
          role?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean | null
          role?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_submissions: {
        Row: {
          ai_evaluation: Json | null
          created_at: string
          file_name: string
          file_size: number
          file_url: string | null
          folder_id: string
          id: string
          student_email: string
          student_name: string
          student_registration: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          ai_evaluation?: Json | null
          created_at?: string
          file_name: string
          file_size: number
          file_url?: string | null
          folder_id: string
          id?: string
          student_email: string
          student_name: string
          student_registration: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          ai_evaluation?: Json | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_url?: string | null
          folder_id?: string
          id?: string
          student_email?: string
          student_name?: string
          student_registration?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_submissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "submission_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_folders: {
        Row: {
          assignment_theme: string
          class_name: string
          created_at: string | null
          created_by: string | null
          due_date: string
          id: string
          is_active: boolean | null
          name: string
          share_link: string
          submissions_count: number | null
          updated_at: string | null
        }
        Insert: {
          assignment_theme: string
          class_name: string
          created_at?: string | null
          created_by?: string | null
          due_date: string
          id?: string
          is_active?: boolean | null
          name: string
          share_link: string
          submissions_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assignment_theme?: string
          class_name?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          share_link?: string
          submissions_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teaching_posts: {
        Row: {
          author: string
          created_at: string | null
          created_by: string | null
          description: string
          files: Json | null
          grade_level: string | null
          id: string
          images: Json | null
          likes: number | null
          subject: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          videos: Json | null
          views: number | null
        }
        Insert: {
          author: string
          created_at?: string | null
          created_by?: string | null
          description: string
          files?: Json | null
          grade_level?: string | null
          id?: string
          images?: Json | null
          likes?: number | null
          subject?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          videos?: Json | null
          views?: number | null
        }
        Update: {
          author?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          files?: Json | null
          grade_level?: string | null
          id?: string
          images?: Json | null
          likes?: number | null
          subject?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          videos?: Json | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_unique_share_link: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_slug: {
        Args: { name_input: string; profile_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
