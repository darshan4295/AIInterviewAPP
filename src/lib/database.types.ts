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
      candidates: {
        Row: {
          id: string
          name: string
          email: string
          linkedin_url: string | null
          github_url: string | null
          resume_url: string | null
          skills: string[]
          experience: number
          status: 'screening' | 'video_interview' | 'technical_assessment' | 'managerial_round' | 'completed' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          linkedin_url?: string | null
          github_url?: string | null
          resume_url?: string | null
          skills?: string[]
          experience: number
          status?: 'screening' | 'video_interview' | 'technical_assessment' | 'managerial_round' | 'completed' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          linkedin_url?: string | null
          github_url?: string | null
          resume_url?: string | null
          skills?: string[]
          experience?: number
          status?: 'screening' | 'video_interview' | 'technical_assessment' | 'managerial_round' | 'completed' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          candidate_id: string
          type: 'video' | 'technical' | 'managerial'
          status: 'scheduled' | 'completed' | 'cancelled'
          scheduled_at: string
          feedback: string | null
          score: number | null
          transcript: string | null
          recording_url: string | null
          ai_analysis: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          type: 'video' | 'technical' | 'managerial'
          status?: 'scheduled' | 'completed' | 'cancelled'
          scheduled_at: string
          feedback?: string | null
          score?: number | null
          transcript?: string | null
          recording_url?: string | null
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          type?: 'video' | 'technical' | 'managerial'
          status?: 'scheduled' | 'completed' | 'cancelled'
          scheduled_at?: string
          feedback?: string | null
          score?: number | null
          transcript?: string | null
          recording_url?: string | null
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
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