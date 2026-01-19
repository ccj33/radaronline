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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_comments: {
        Row: {
          action_id: string
          author_id: string
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
        }
        Insert: {
          action_id: string
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Update: {
          action_id?: string
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_comments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "action_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      action_raci: {
        Row: {
          action_id: string
          created_at: string | null
          id: string
          member_name: string
          role: string
        }
        Insert: {
          action_id: string
          created_at?: string | null
          id?: string
          member_name: string
          role: string
        }
        Update: {
          action_id?: string
          created_at?: string | null
          id?: string
          member_name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_raci_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      action_tag_assignments: {
        Row: {
          action_uid: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          action_uid: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          action_uid?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "action_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      action_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          action_id: string
          activity_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          microregiao_id: string
          notes: string | null
          planned_end_date: string | null
          progress: number | null
          start_date: string | null
          status: string
          title: string
          uid: string
          updated_at: string | null
        }
        Insert: {
          action_id: string
          activity_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          microregiao_id: string
          notes?: string | null
          planned_end_date?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string
          title: string
          uid: string
          updated_at?: string | null
        }
        Update: {
          action_id?: string
          activity_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          microregiao_id?: string
          notes?: string | null
          planned_end_date?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string
          title?: string
          uid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          microregiao_id: string
          objective_id: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          microregiao_id: string
          objective_id?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          microregiao_id?: string
          objective_id?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      microregioes: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          macro_id: string | null
          macrorregiao: string | null
          nome: string
          urs: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          macro_id?: string | null
          macrorregiao?: string | null
          nome: string
          urs?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          macro_id?: string | null
          macrorregiao?: string | null
          nome?: string
          urs?: string | null
        }
        Relationships: []
      }
      objectives: {
        Row: {
          created_at: string | null
          id: number
          microregiao_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          microregiao_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          microregiao_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          first_access: boolean | null
          id: string
          lgpd_consentimento: boolean | null
          lgpd_consentimento_data: string | null
          microregiao_id: string | null
          municipio: string | null
          nome: string
          role: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          first_access?: boolean | null
          id: string
          lgpd_consentimento?: boolean | null
          lgpd_consentimento_data?: string | null
          microregiao_id?: string | null
          municipio?: string | null
          nome: string
          role: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_access?: boolean | null
          id?: string
          lgpd_consentimento?: boolean | null
          lgpd_consentimento_data?: string | null
          microregiao_id?: string | null
          municipio?: string | null
          nome?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          cargo: string
          created_at: string | null
          email: string | null
          id: string
          microregiao_id: string
          municipio: string | null
          name: string
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          cargo: string
          created_at?: string | null
          email?: string | null
          id?: string
          microregiao_id: string
          municipio?: string | null
          name: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string | null
          email?: string | null
          id?: string
          microregiao_id?: string
          municipio?: string | null
          name?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          element: string | null
          event_type: string
          id: string
          metadata: Json | null
          page: string
          scroll_depth: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          element?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page: string
          scroll_depth?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          element?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page?: string
          scroll_depth?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_requests: {
        Row: {
          admin_notes: string | null
          content: string
          created_at: string | null
          id: string
          request_type: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          content: string
          created_at?: string | null
          id?: string
          request_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          content?: string
          created_at?: string | null
          id?: string
          request_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: number
          role: string
          user_id: string
        }
        Insert: {
          id?: number
          role: string
          user_id: string
        }
        Update: {
          id?: number
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          page_count: number | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          page_count?: number | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          page_count?: number | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_page_stats: {
        Row: {
          avg_scroll_depth: number | null
          avg_time_seconds: number | null
          date: string | null
          page: string | null
          unique_users: number | null
          view_count: number | null
        }
        Relationships: []
      }
      analytics_region_engagement: {
        Row: {
          active_users: number | null
          avg_session_duration: number | null
          last_activity: string | null
          microregiao_id: string | null
          municipio: string | null
          total_sessions: number | null
          total_views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_analytics: { Args: never; Returns: undefined }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      debug_auth_uid: { Args: never; Returns: Json }
      get_auth_uid: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_user_microregiao: { Args: never; Returns: string }
      get_user_role_safe: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_superadmin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
