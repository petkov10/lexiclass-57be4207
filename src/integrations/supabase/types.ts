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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          access_mode: string
          color_scheme: string
          extra: Json
          global_pin: string | null
          grading_scale: Json
          id: number
          logo_text: string | null
          logo_url: string | null
          site_name: string
          theme_mode: string
          updated_at: string
        }
        Insert: {
          access_mode?: string
          color_scheme?: string
          extra?: Json
          global_pin?: string | null
          grading_scale?: Json
          id?: number
          logo_text?: string | null
          logo_url?: string | null
          site_name?: string
          theme_mode?: string
          updated_at?: string
        }
        Update: {
          access_mode?: string
          color_scheme?: string
          extra?: Json
          global_pin?: string | null
          grading_scale?: Json
          id?: number
          logo_text?: string | null
          logo_url?: string | null
          site_name?: string
          theme_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          attachments: Json
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          theme_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          theme_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          theme_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_pin: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_paused: boolean
          last_login_at: string | null
        }
        Insert: {
          access_pin?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_paused?: boolean
          last_login_at?: string | null
        }
        Update: {
          access_pin?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_paused?: boolean
          last_login_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          order_index: number
          theme_id: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          order_index?: number
          theme_id: string
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          order_index?: number
          theme_id?: string
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          note: string | null
          owner_id: string
          start_time: string
          subject_id: string
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          note?: string | null
          owner_id: string
          start_time: string
          subject_id: string
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          note?: string | null
          owner_id?: string
          start_time?: string
          subject_id?: string
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json
          class_id: string | null
          created_at: string
          duration_seconds: number
          grade: number | null
          id: string
          max_score: number
          percent: number
          resource_id: string
          score: number
          started_at: string
          student_class: string | null
          student_name: string
          student_number: string | null
          submitted_at: string
          theme_id: string | null
        }
        Insert: {
          answers?: Json
          class_id?: string | null
          created_at?: string
          duration_seconds?: number
          grade?: number | null
          id?: string
          max_score?: number
          percent?: number
          resource_id: string
          score?: number
          started_at?: string
          student_class?: string | null
          student_name: string
          student_number?: string | null
          submitted_at?: string
          theme_id?: string | null
        }
        Update: {
          answers?: Json
          class_id?: string | null
          created_at?: string
          duration_seconds?: number
          grade?: number | null
          id?: string
          max_score?: number
          percent?: number
          resource_id?: string
          score?: number
          started_at?: string
          student_class?: string | null
          student_name?: string
          student_number?: string | null
          submitted_at?: string
          theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_private_notes: {
        Row: {
          notes: string | null
          theme_id: string
          updated_at: string
        }
        Insert: {
          notes?: string | null
          theme_id: string
          updated_at?: string
        }
        Update: {
          notes?: string | null
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_private_notes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: true
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          subject_id: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          subject_id: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          subject_id?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "themes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "themes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_user_pins: {
        Args: never
        Returns: {
          access_pin: string
          is_paused: boolean
          last_login_at: string
          user_id: string
        }[]
      }
      admin_set_access: {
        Args: { _global_pin: string; _mode: string }
        Returns: undefined
      }
      admin_set_user_display_name: {
        Args: { _name: string; _user_id: string }
        Returns: undefined
      }
      admin_set_user_paused: {
        Args: { _paused: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: undefined
      }
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      get_access_mode: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_access_pin: {
        Args: { _pin: string }
        Returns: {
          display_name: string
          mode: string
          ok: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "editor"
      resource_type:
        | "presentation"
        | "document"
        | "link"
        | "video"
        | "test"
        | "task"
        | "code"
        | "image"
        | "note"
        | "other"
        | "notebooklm"
        | "flashcards"
        | "lesson_plan"
        | "code_exercise"
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
    Enums: {
      app_role: ["admin", "user", "editor"],
      resource_type: [
        "presentation",
        "document",
        "link",
        "video",
        "test",
        "task",
        "code",
        "image",
        "note",
        "other",
        "notebooklm",
        "flashcards",
        "lesson_plan",
        "code_exercise",
      ],
    },
  },
} as const
