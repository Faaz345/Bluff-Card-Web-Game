-- Create schema for Bluff Card Game

-- Enable Row Level Security on all tables
-- These lines are removed as they cause permission errors in Supabase
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';
-- ALTER DATABASE postgres SET "app.jwt_exp" TO 3600;

-- Create tables
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('lobby', 'active', 'complete')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  seat INTEGER NOT NULL DEFAULT 0,
  current_turn BOOLEAN NOT NULL DEFAULT false,
  eliminated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_id, user_id),
  UNIQUE(game_id, seat)
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  owner_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  value TEXT NOT NULL,
  face_up BOOLEAN NOT NULL DEFAULT false,
  in_play_zone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_type TEXT NOT NULL CHECK (move_type IN ('play', 'challenge', 'pass', 'reveal', 'penalty')),
  cards_played UUID[] DEFAULT '{}',
  claimed_value TEXT,
  result TEXT CHECK (result IN ('pass', 'fail', NULL)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Drop view if it exists (it might be causing issues)
DROP VIEW IF EXISTS user_games_view;

-- Create tables and set up RLS policies

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a user is in a game
CREATE OR REPLACE FUNCTION is_user_in_game(game_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players
    WHERE players.game_id = $1
    AND players.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS games_select_policy ON games;
DROP POLICY IF EXISTS games_insert_policy ON games;
DROP POLICY IF EXISTS games_update_policy ON games;
DROP POLICY IF EXISTS players_select_policy ON players;
DROP POLICY IF EXISTS players_insert_policy ON players;
DROP POLICY IF EXISTS players_update_policy ON players;
DROP POLICY IF EXISTS players_delete_policy ON players;
DROP POLICY IF EXISTS cards_select_policy ON cards;
DROP POLICY IF EXISTS cards_insert_policy ON cards;
DROP POLICY IF EXISTS cards_update_policy ON cards;
DROP POLICY IF EXISTS moves_select_policy ON moves;
DROP POLICY IF EXISTS moves_insert_policy ON moves;

-- Games table policies
-- Allow users to see games they created or are part of, and games in lobby state
CREATE POLICY games_select_policy ON games
  FOR SELECT USING (
    created_by = auth.uid() OR 
    is_user_in_game(games.id) OR
    status = 'lobby'
  );

-- Allow authenticated users to insert their own games
CREATE POLICY games_insert_policy ON games
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow game creators to update their games
CREATE POLICY games_update_policy ON games
  FOR UPDATE USING (auth.uid() = created_by);

-- Players table policies
-- Allow all authenticated users to see players
CREATE POLICY players_select_policy ON players
  FOR SELECT USING (true);

-- Allow authenticated users to insert themselves as players
CREATE POLICY players_insert_policy ON players
  FOR INSERT WITH CHECK (auth.uid() = players.user_id);

-- Allow users to update their own player records
CREATE POLICY players_update_policy ON players
  FOR UPDATE USING (auth.uid() = players.user_id);

-- Allow users to delete their own player records (leave game)
CREATE POLICY players_delete_policy ON players
  FOR DELETE USING (auth.uid() = players.user_id);

-- Cards table policies
-- Allow users to see cards in games they're in
CREATE POLICY cards_select_policy ON cards
  FOR SELECT USING (
    is_user_in_game(cards.game_id) AND (
      -- Can see your own cards
      cards.owner_player_id IN (SELECT id FROM players WHERE players.user_id = auth.uid()) OR
      -- Can see face-up cards
      cards.face_up = true OR
      -- Can see cards in play zone
      cards.in_play_zone = true
    )
  );

-- Allow game creators to insert cards
CREATE POLICY cards_insert_policy ON cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = cards.game_id
      AND games.created_by = auth.uid()
    )
  );

-- Allow game creators to update cards
CREATE POLICY cards_update_policy ON cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = cards.game_id
      AND games.created_by = auth.uid()
    )
  );

-- Moves table policies
-- Allow users to see moves in games they're in
CREATE POLICY moves_select_policy ON moves
  FOR SELECT USING (is_user_in_game(moves.game_id));

-- Allow users to insert moves if it's their turn
CREATE POLICY moves_insert_policy ON moves
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.user_id = auth.uid()
      AND players.game_id = moves.game_id
      AND players.current_turn = true
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_cards_game_id ON cards(game_id);
CREATE INDEX IF NOT EXISTS idx_cards_owner_player_id ON cards(owner_player_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_player_id ON moves(player_id);

-- Drop and recreate function to avoid errors
DROP FUNCTION IF EXISTS initialize_game_deck(UUID);
-- Custom function to initialize a new game deck
CREATE OR REPLACE FUNCTION initialize_game_deck(game_id UUID)
RETURNS void AS $$
DECLARE
  card_values TEXT[] := ARRAY['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  card_suits TEXT[] := ARRAY['♥', '♦', '♣', '♠'];
  player_records RECORD;
  player_count INTEGER := 0;
  cards_per_player INTEGER;
  card_value TEXT;
  card_suit TEXT;
  card_full_value TEXT;
  i INTEGER;
  j INTEGER;
  player_index INTEGER := 0;
  current_player UUID;
  players_array UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Count players in the game
  SELECT COUNT(*) INTO player_count FROM players WHERE players.game_id = initialize_game_deck.game_id;
  
  -- Calculate cards per player based on number of players
  cards_per_player := CASE
    WHEN player_count <= 3 THEN 7
    WHEN player_count <= 5 THEN 6
    ELSE 5
  END;
  
  -- Build array of player IDs ordered by seat
  FOR player_records IN 
    SELECT id FROM players WHERE players.game_id = initialize_game_deck.game_id ORDER BY seat
  LOOP
    players_array := array_append(players_array, player_records.id);
  END LOOP;
  
  -- Create a standard deck
  FOR i IN 1..array_length(card_suits, 1) LOOP
    FOR j IN 1..array_length(card_values, 1) LOOP
      card_suit := card_suits[i];
      card_value := card_values[j];
      card_full_value := card_value || card_suit;
      
      -- Alternate card assignment to players
      current_player := players_array[(player_index % player_count) + 1];
      player_index := player_index + 1;
      
      -- Insert card
      INSERT INTO cards (game_id, owner_player_id, value, face_up, in_play_zone)
      VALUES (initialize_game_deck.game_id, current_player, card_full_value, false, false);
      
      -- Stop if we've dealt enough cards
      IF player_index >= player_count * cards_per_player THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Stop if we've dealt enough cards
    IF player_index >= player_count * cards_per_player THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Set first player's turn
  UPDATE players 
  SET current_turn = true 
  WHERE id = players_array[1];
  
  -- Update game status
  UPDATE games 
  SET status = 'active', updated_at = now() 
  WHERE id = initialize_game_deck.game_id;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to initialize the game when status changes from lobby to active
CREATE OR REPLACE FUNCTION handle_game_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the function to initialize the game deck
  PERFORM initialize_game_deck(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_start_trigger
AFTER UPDATE ON games
FOR EACH ROW
WHEN (OLD.status = 'lobby' AND NEW.status = 'active')
EXECUTE FUNCTION handle_game_start(); 