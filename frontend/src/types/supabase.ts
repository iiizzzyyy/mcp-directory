/**
 * Supabase Database Types
 * 
 * Generated types for the Supabase database schema.
 * These types are used to provide type safety when interacting with the database.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          two_fa_enabled: boolean | null
          created_at: string
          updated_at: string
          search_vector: unknown | null
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          two_fa_enabled?: boolean | null
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          two_fa_enabled?: boolean | null
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      servers: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          tags: string[] | null
          platform: string | null
          install_method: string | null
          github_url: string | null
          stars: number | null
          forks: number | null
          open_issues: number | null
          contributors: number | null
          last_updated: string | null
          source: string | null
          created_at: string
          updated_at: string
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          platform?: string | null
          install_method?: string | null
          github_url?: string | null
          stars?: number | null
          forks?: number | null
          open_issues?: number | null
          contributors?: number | null
          last_updated?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          platform?: string | null
          install_method?: string | null
          github_url?: string | null
          stars?: number | null
          forks?: number | null
          open_issues?: number | null
          contributors?: number | null
          last_updated?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: unknown | null
        }
        Relationships: []
      }
      health_data: {
        Row: {
          id: string
          server_id: string
          last_check_time: string
          status: string
          response_time_ms: number | null
          error_message: string | null
          check_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          server_id: string
          last_check_time: string
          status: string
          response_time_ms?: number | null
          error_message?: string | null
          check_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          server_id?: string
          last_check_time?: string
          status?: string
          response_time_ms?: number | null
          error_message?: string | null
          check_method?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_data_server_id_fkey"
            columns: ["server_id"]
            referencedRelation: "servers"
            referencedColumns: ["id"]
          }
        ]
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
  }
}
