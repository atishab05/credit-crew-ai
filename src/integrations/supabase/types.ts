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
      agent_results: {
        Row: {
          agent_name: string
          application_id: string
          completed_at: string | null
          id: string
          output: Json | null
          started_at: string
          status: string
        }
        Insert: {
          agent_name: string
          application_id: string
          completed_at?: string | null
          id?: string
          output?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          agent_name?: string
          application_id?: string
          completed_at?: string | null
          id?: string
          output?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_results_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_name: string
          borrowing_capacity: number | null
          confidence_level: string | null
          consent_at: string | null
          consent_given: boolean
          consent_reference: string | null
          created_at: string
          decided_at: string | null
          decision: string | null
          decision_notes: string | null
          gstin: string
          id: string
          loan_officer_id: string
          overall_health_score: number | null
          pan: string
          pii_erased_at: string | null
          recommended_loan_product: string | null
          retention_until: string | null
          risk_rating: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_name: string
          borrowing_capacity?: number | null
          confidence_level?: string | null
          consent_at?: string | null
          consent_given?: boolean
          consent_reference?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          gstin: string
          id?: string
          loan_officer_id: string
          overall_health_score?: number | null
          pan: string
          pii_erased_at?: string | null
          recommended_loan_product?: string | null
          retention_until?: string | null
          risk_rating?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_name?: string
          borrowing_capacity?: number | null
          confidence_level?: string | null
          consent_at?: string | null
          consent_given?: boolean
          consent_reference?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          gstin?: string
          id?: string
          loan_officer_id?: string
          overall_health_score?: number | null
          pan?: string
          pii_erased_at?: string | null
          recommended_loan_product?: string | null
          retention_until?: string | null
          risk_rating?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          application_id: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          application_id: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          application_id?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      data_connections: {
        Row: {
          application_id: string
          connected_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          source: string
          status: string
        }
        Insert: {
          application_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          source: string
          status?: string
        }
        Update: {
          application_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_connections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_settings: {
        Row: {
          base_url: string | null
          created_at: string
          mode: string
          source: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          mode?: string
          source: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          mode?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          application_id: string
          content_type: string | null
          created_at: string
          filename: string
          id: string
          s3_key: string
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          application_id: string
          content_type?: string | null
          created_at?: string
          filename: string
          id?: string
          s3_key: string
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          application_id?: string
          content_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          s3_key?: string
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
