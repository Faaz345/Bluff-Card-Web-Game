import { createClient } from '@supabase/supabase-js';

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
      games: {
        Row: {
          id: string
          code: string
          status: 'lobby' | 'active' | 'complete'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          status?: 'lobby' | 'active' | 'complete'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          status?: 'lobby' | 'active' | 'complete'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          user_id: string
          game_id: string
          display_name: string
          seat: number
          current_turn: boolean
          eliminated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          display_name: string
          seat?: number
          current_turn?: boolean
          eliminated?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          display_name?: string
          seat?: number
          current_turn?: boolean
          eliminated?: boolean
          created_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          game_id: string
          owner_player_id: string | null
          value: string
          face_up: boolean
          in_play_zone: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          owner_player_id?: string | null
          value: string
          face_up?: boolean
          in_play_zone?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          owner_player_id?: string | null
          value?: string
          face_up?: boolean
          in_play_zone?: boolean
          created_at?: string
        }
      }
      moves: {
        Row: {
          id: string
          game_id: string
          player_id: string | null
          move_type: 'play' | 'challenge' | 'pass' | 'reveal' | 'penalty' | 'game_start' | 'game_end'
          cards_played: string[]
          claimed_value: string | null
          result: 'pass' | 'fail' | 'win' | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id?: string | null
          move_type: 'play' | 'challenge' | 'pass' | 'reveal' | 'penalty' | 'game_start' | 'game_end'
          cards_played?: string[]
          claimed_value?: string | null
          result?: 'pass' | 'fail' | 'win' | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string | null
          move_type?: 'play' | 'challenge' | 'pass' | 'reveal' | 'penalty' | 'game_start' | 'game_end'
          cards_played?: string[]
          claimed_value?: string | null
          result?: 'pass' | 'fail' | 'win' | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      initialize_game_deck: {
        Args: {
          game_id: string
        }
        Returns: undefined
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

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

// For backward compatibility
export const getSupabaseClient = createSupabaseClient;
export const supabase = createSupabaseClient(); 