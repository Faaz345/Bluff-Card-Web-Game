-- Fix ambiguous column references in functions and policies

-- Update the is_user_in_game function to use fully qualified column names
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

-- Update the initialize_game_deck function to use fully qualified column names
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

-- Update the cards_select_policy to use fully qualified column names
DROP POLICY IF EXISTS cards_select_policy ON cards;
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

-- Update the cards_insert_policy to use fully qualified column names
DROP POLICY IF EXISTS cards_insert_policy ON cards;
CREATE POLICY cards_insert_policy ON cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = cards.game_id
      AND games.created_by = auth.uid()
    )
  );

-- Update the cards_update_policy to use fully qualified column names
DROP POLICY IF EXISTS cards_update_policy ON cards;
CREATE POLICY cards_update_policy ON cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = cards.game_id
      AND games.created_by = auth.uid()
    )
  );

-- Update the moves_insert_policy to use fully qualified column names
DROP POLICY IF EXISTS moves_insert_policy ON moves;
CREATE POLICY moves_insert_policy ON moves
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.user_id = auth.uid()
      AND players.game_id = moves.game_id
      AND players.current_turn = true
    )
  ); 