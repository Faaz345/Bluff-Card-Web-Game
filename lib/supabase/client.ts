import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single shared Supabase client for the entire application
// This ensures that authentication state is shared across all components and tabs
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token', // Use a consistent storage key
  },
});

// For server-side rendering or client-side use, always return the same instance
export const getSupabaseClient = () => {
  // For server-side rendering, log that we're using the server instance
  if (typeof window === 'undefined') {
    console.log('Creating new Supabase client instance for tab: server');
  }
  
  // Always return the same instance to avoid authentication issues across tabs
  return supabase;
};

// Define database types
export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          code: string;
          status: 'lobby' | 'active' | 'complete';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      players: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          display_name: string;
          seat: number;
          current_turn: boolean;
          eliminated: boolean;
        };
      };
      cards: {
        Row: {
          id: string;
          game_id: string;
          owner_player_id: string | null;
          value: string;
          face_up: boolean;
          in_play_zone: boolean;
        };
      };
      moves: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          move_type: 'play' | 'challenge' | 'pass' | 'reveal' | 'penalty';
          cards_played: string[];
          claimed_value: string | null;
          result: 'pass' | 'fail' | null;
          created_at: string;
        };
      };
    };
  };
}; 