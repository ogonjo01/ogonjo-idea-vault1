export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_ideas: {
        Row: {
          benefits: string[] | null
          category: string | null
          comments: number | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          difficulty: string | null
          icon: string | null
          id: string
          investment_needed: string | null
          is_featured: boolean | null
          likes: number | null
          market_size: string | null
          price: number | null
          tags: string | null
          thumbnail: string | null
          timeline: string | null
          title: string
          use_cases: string[] | null
          views: number | null
        }
        Insert: {
          benefits?: string[] | null
          category?: string | null
          comments?: number | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          difficulty?: string | null
          icon?: string | null
          id?: string
          investment_needed?: string | null
          is_featured?: boolean | null
          likes?: number | null
          market_size?: string | null
          price?: number | null
          tags?: string | null
          thumbnail?: string | null
          timeline?: string | null
          title: string
          use_cases?: string[] | null
          views?: number | null
        }
        Update: {
          benefits?: string[] | null
          category?: string | null
          comments?: number | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          difficulty?: string | null
          icon?: string | null
          id?: string
          investment_needed?: string | null
          is_featured?: boolean | null
          likes?: number | null
          market_size?: string | null
          price?: number | null
          tags?: string | null
          thumbnail?: string | null
          timeline?: string | null
          title?: string
          use_cases?: string[] | null
          views?: number | null
        }
        Relationships: []
      }
      idea_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          idea_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_likes: {
        Row: {
          created_at: string | null
          id: string
          idea_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_likes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          file_url: string
          id: string
          idea_id: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          file_url: string
          id?: string
          idea_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          file_url?: string
          id?: string
          idea_id?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          plan: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          plan?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          plan?: string | null
          role?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          idea_id: string
          status: string
          tx_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          idea_id: string
          status?: string
          tx_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          idea_id?: string
          status?: string
          tx_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
