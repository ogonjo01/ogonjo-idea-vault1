import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cascfuzibfifbhabujbn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc2NmdXppYmZpZmJoYWJ1amJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDk4NTksImV4cCI6MjA2NTIyNTg1OX0.GJY4QMdjgxhFyGIC8MCrZJPu5OYFQDKTuJQRfgHQvPU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      idea_likes: {
        Row: {
          id: string
          user_id: string
          idea_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          idea_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          idea_id?: string
          created_at?: string
        }
      }
      idea_comments: {
        Row: {
          id: string
          user_id: string
          idea_id: string
          comment: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          idea_id: string
          comment: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          idea_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
        }
      }
      business_ideas: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          market_size: string
          investment_needed: string
          timeline: string
          tags: string[]
          thumbnail: string
          presentation_url: string | null
          views: number
          likes: number
          created_at: string
          updated_at: string
          is_featured: boolean
          author_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          market_size: string
          investment_needed: string
          timeline: string
          tags?: string[]
          thumbnail?: string
          views?: number
          likes?: number
          created_at?: string
          updated_at?: string
          is_featured?: boolean
          author_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          difficulty?: 'beginner' | 'intermediate' | 'advanced'
          market_size?: string
          investment_needed?: string
          timeline?: string
          tags?: string[]
          thumbnail?: string
          views?: number
          likes?: number
          created_at?: string
          updated_at?: string
          is_featured?: boolean
          author_id?: string | null
        }
      }
    }
  }
}