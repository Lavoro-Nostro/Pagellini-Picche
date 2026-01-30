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
  public: {
    Tables: {
      event_attendance: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          details: string | null
          event_date: string
          event_time: string
          event_type: string
          id: string
          is_active: boolean
          location_address: string | null
          location_name: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_date: string
          event_time: string
          event_type: string
          id?: string
          is_active?: boolean
          location_address?: string | null
          location_name?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          event_date?: string
          event_time?: string
          event_type?: string
          id?: string
          is_active?: boolean
          location_address?: string | null
          location_name?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_sheets: {
        Row: {
          created_at: string
          gym_location: string | null
          id: string
          match_result: string | null
          note: string | null
          set_scores: Json | null
          sheet_category: string
          sheet_date: string
          sheet_type: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gym_location?: string | null
          id?: string
          match_result?: string | null
          note?: string | null
          set_scores?: Json | null
          sheet_category?: string
          sheet_date: string
          sheet_type?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gym_location?: string | null
          id?: string
          match_result?: string | null
          note?: string | null
          set_scores?: Json | null
          sheet_category?: string
          sheet_date?: string
          sheet_type?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_sheets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          is_cancelled: boolean
          is_home: boolean
          location_address: string
          location_name: string
          match_date: string
          match_time: string
          notes: string | null
          opponent: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cancelled?: boolean
          is_home?: boolean
          location_address: string
          location_name: string
          match_date: string
          match_time: string
          notes?: string | null
          opponent: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cancelled?: boolean
          is_home?: boolean
          location_address?: string
          location_name?: string
          match_date?: string
          match_time?: string
          notes?: string | null
          opponent?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_settings: {
        Row: {
          created_at: string
          id: string
          onesignal_app_id: string | null
          onesignal_rest_api_key: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          onesignal_app_id?: string | null
          onesignal_rest_api_key?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          onesignal_app_id?: string | null
          onesignal_rest_api_key?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_votes: {
        Row: {
          created_at: string
          grade_sheet_id: string
          id: string
          voted_player_name: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          grade_sheet_id: string
          id?: string
          voted_player_name: string
          voter_id: string
        }
        Update: {
          created_at?: string
          grade_sheet_id?: string
          id?: string
          voted_player_name?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_grade_sheet_id_fkey"
            columns: ["grade_sheet_id"]
            isOneToOne: false
            referencedRelation: "grade_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_grades: {
        Row: {
          alzate: number | null
          appoggi_alzate: number | null
          attacchi: number | null
          attacco: number | null
          battuta: number | null
          commento: string | null
          created_at: string
          difesa: number | null
          grade_sheet_id: string
          id: string
          is_mvp: boolean
          muri: number | null
          player_name: string
          player_role: string | null
          ricezione: number | null
          ricezione_difesa: number | null
          voto_generale: number | null
        }
        Insert: {
          alzate?: number | null
          appoggi_alzate?: number | null
          attacchi?: number | null
          attacco?: number | null
          battuta?: number | null
          commento?: string | null
          created_at?: string
          difesa?: number | null
          grade_sheet_id: string
          id?: string
          is_mvp?: boolean
          muri?: number | null
          player_name: string
          player_role?: string | null
          ricezione?: number | null
          ricezione_difesa?: number | null
          voto_generale?: number | null
        }
        Update: {
          alzate?: number | null
          appoggi_alzate?: number | null
          attacchi?: number | null
          attacco?: number | null
          battuta?: number | null
          commento?: string | null
          created_at?: string
          difesa?: number | null
          grade_sheet_id?: string
          id?: string
          is_mvp?: boolean
          muri?: number | null
          player_name?: string
          player_role?: string | null
          ricezione?: number | null
          ricezione_difesa?: number | null
          voto_generale?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_grades_grade_sheet_id_fkey"
            columns: ["grade_sheet_id"]
            isOneToOne: false
            referencedRelation: "grade_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          player_role: string | null
          team_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          player_role?: string | null
          team_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          player_role?: string | null
          team_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          moderator_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          moderator_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          moderator_id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string
          password: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          password: string
          role: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          password?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_moderator_team_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "moderator" | "player"
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
      app_role: ["moderator", "player"],
    },
  },
} as const
