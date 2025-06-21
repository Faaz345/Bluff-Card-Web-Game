'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, GameLog, PlayZone, PlayerHand, GameOver, WaitingScreen } from '@/components/game';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [claimedValue, setClaimedValue] = useState<string>('');
  const [playZoneCards, setPlayZoneCards] = useState<any[]>([]);
  const [isYourTurn, setIsYourTurn] = useState(false);
  const [gameLog, setGameLog] = useState<string[]>([]);
  
  // Use a ref to store the Supabase client to avoid recreation on re-renders
  const supabaseRef = useRef(getSupabaseClient());
  
  // Store subscription references to clean them up properly
  const subscriptionsRef = useRef<{ [key: string]: any }>({});
  
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('Checking user authentication...');
        const { data: { user }, error: authError } = await supabaseRef.current.auth.getUser();
        
        if (authError) {
          console.error('Authentication error:', authError);
          setError('Authentication error: ' + authError.message);
          setDetailedError(authError);
          setLoading(false);
          return;
        }
        
        if (!user) {
          console.log('No authenticated user found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        console.log('User authenticated:', user.email);
        setUser(user);
        fetchGameData(params.gameId);
      } catch (error: any) {
        console.error('Auth check error:', error);
        setError('Authentication check failed: ' + error.message);
        setDetailedError(error);
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Clean up subscriptions when component unmounts
    return () => {
      console.log('Cleaning up all subscriptions');
      Object.values(subscriptionsRef.current).forEach((subscription: any) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
    };
  }, [params.gameId, router]);
  
  const setupSubscriptions = (gameId: string) => {
    try {
      // Clean up any existing subscriptions first
      if (subscriptionsRef.current.gameSubscription) {
        subscriptionsRef.current.gameSubscription.unsubscribe();
      }
      
      if (subscriptionsRef.current.playersSubscription) {
        subscriptionsRef.current.playersSubscription.unsubscribe();
      }
      
      console.log('Setting up real-time subscriptions...');
      
      // Set up real-time subscription for game updates
      const gameChannel = `game:${gameId}`;
      const gameSubscription = supabaseRef.current
        .channel(gameChannel)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
          (payload) => {
            console.log('Game updated:', payload);
            setGame(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('Game subscription status:', status);
        });
        
      // Set up real-time subscription for player updates
      const playersChannel = `players:${gameId}`;
      const playersSubscription = supabaseRef.current
        .channel(playersChannel)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
          (payload) => {
            console.log('Players updated:', payload);
            fetchPlayers(gameId);
          }
        )
        .subscribe((status) => {
          console.log('Players subscription status:', status);
        });
      
      // Set up real-time subscription for card updates
      const cardsChannel = `cards:${gameId}`;
      const cardsSubscription = supabaseRef.current
        .channel(cardsChannel)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
          (payload) => {
            console.log('Cards updated:', payload);
            fetchPlayerCards(gameId);
            fetchPlayZoneCards(gameId);
          }
        )
        .subscribe((status) => {
          console.log('Cards subscription status:', status);
        });
      
      // Set up real-time subscription for move updates
      const movesChannel = `moves:${gameId}`;
      const movesSubscription = supabaseRef.current
        .channel(movesChannel)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
          (payload) => {
            console.log('Move made:', payload);
            updateGameLog(payload.new);
          }
        )
        .subscribe((status) => {
          console.log('Moves subscription status:', status);
        });
      
      // Store subscriptions for cleanup
      subscriptionsRef.current = {
        gameSubscription,
        playersSubscription,
        cardsSubscription,
        movesSubscription
      };
    } catch (error: any) {
      console.error('Error setting up subscriptions:', error);
    }
  };
  
  const fetchGameData = async (gameId: string) => {
    try {
      console.log('Fetching game data for ID:', gameId);
      
      // Fetch game data
      const { data: gameData, error: gameError } = await supabaseRef.current
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
        
      if (gameError) {
        console.error('Error fetching game data:', gameError);
        setError('Failed to fetch game: ' + gameError.message);
        setDetailedError(gameError);
        setLoading(false);
        return;
      }
      
      if (!gameData) {
        console.error('Game not found with ID:', gameId);
        setError('Game not found');
        setLoading(false);
        return;
      }
      
      console.log('Game data fetched successfully:', gameData);
      setGame(gameData);
      
      // Fetch players in this game
      const { data: playersData, error: playersError } = await supabaseRef.current
        .from('players')
        .select('*')
        .eq('game_id', gameId);
        
      if (playersError) {
        console.error('Error fetching players:', playersError);
        setError('Failed to fetch players: ' + playersError.message);
        setDetailedError(playersError);
        setLoading(false);
        return;
      }
      
      console.log('Players fetched successfully:', playersData);
      setPlayers(playersData || []);
      
      // If game is active, fetch cards for the current player
      if (gameData.status === 'active') {
        await fetchPlayerCards(gameId);
        await fetchPlayZoneCards(gameId);
      }
      
      // Set up subscriptions after data is loaded
      setupSubscriptions(gameId);
    } catch (error: any) {
      console.error('Error in fetchGameData:', error);
      setError('Failed to load game data: ' + error.message);
      setDetailedError(error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPlayers = async (gameId: string) => {
    try {
      console.log('Fetching updated player list for game:', gameId);
      const { data, error } = await supabaseRef.current
        .from('players')
        .select('*')
        .eq('game_id', gameId);
        
      if (error) {
        console.error('Error fetching players:', error);
        return;
      }
      
      console.log('Updated players list:', data);
      setPlayers(data || []);
    } catch (error: any) {
      console.error('Error in fetchPlayers:', error);
    }
  };
  
  // Fetch cards for the current player
  const fetchPlayerCards = async (gameId: string) => {
    if (!user) return;
    
    try {
      // First get the player ID
      console.log('Fetching cards for user:', user.id, 'in game:', gameId);
      const { data: playerData, error: playerError } = await supabaseRef.current
        .from('players')
        .select('id, current_turn')
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .single();
      
      if (playerError) {
        console.error('Error finding player:', playerError);
        return;
      }
      
      if (!playerData) {
        console.error('No player found for current user in this game');
        return;
      }
      
      console.log('Found player:', playerData);
      
      // Set if it's the player's turn
      setIsYourTurn(playerData.current_turn);
      
      // Get the player's cards
      const { data: cardsData, error: cardsError } = await supabaseRef.current
        .from('cards')
        .select('*')
        .eq('game_id', gameId)
        .eq('owner_player_id', playerData.id)
        .eq('in_play_zone', false);
        
      if (cardsError) {
        console.error('Error fetching player cards:', cardsError);
        return;
      }
      
      console.log('Player cards found:', cardsData?.length || 0, cardsData);
      setCards(cardsData || []);
    } catch (error: any) {
      console.error('Error fetching player cards:', error);
    }
  };
  
  // Fetch cards in the play zone
  const fetchPlayZoneCards = async (gameId: string) => {
    try {
      const { data: playZoneCardsData, error: playZoneError } = await supabaseRef.current
        .from('cards')
        .select('*')
        .eq('game_id', gameId)
        .eq('in_play_zone', true);
        
      if (playZoneError) {
        console.error('Error fetching play zone cards:', playZoneError);
        return;
      }
      
      console.log('Play zone cards:', playZoneCardsData);
      setPlayZoneCards(playZoneCardsData || []);
    } catch (error: any) {
      console.error('Error fetching play zone cards:', error);
    }
  };
  
  // Update game log with new move
  const updateGameLog = (move: any) => {
    if (!move) return;
    
    // Find player name
    const player = players.find(p => p.id === move.player_id);
    const playerName = player ? player.display_name : 'Unknown player';
    
    let logMessage = '';
    switch (move.move_type) {
      case 'play':
        logMessage = `${playerName} played ${move.cards_played.length} card(s) claiming ${move.claimed_value}`;
        break;
      case 'challenge':
        logMessage = `${playerName} challenged! Result: ${move.result === 'pass' ? 'Challenge failed' : 'Challenge succeeded'}`;
        break;
      case 'pass':
        logMessage = `${playerName} passed`;
        break;
      default:
        logMessage = `${playerName} made a move: ${move.move_type}`;
    }
    
    setGameLog(prev => [...prev, logMessage]);
  };
  
  // Handle card selection
  const toggleCardSelection = (card: any) => {
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };
  
  // Play selected cards
  const playCards = async (selectedCards: any[], claimedValue: string) => {
    if (!isYourTurn || selectedCards.length === 0 || !claimedValue) {
      return;
    }
    
    try {
      // Find current player
      const currentPlayer = players.find(p => p.user_id === user?.id);
      if (!currentPlayer) return;
      
      // Create a move record
      const moveId = crypto.randomUUID();
      const { error: moveError } = await supabaseRef.current
        .from('moves')
        .insert({
          id: moveId,
          game_id: game.id,
          player_id: currentPlayer.id,
          move_type: 'play',
          cards_played: selectedCards.map(c => c.id),
          claimed_value: claimedValue,
          created_at: new Date().toISOString()
        });
        
      if (moveError) {
        console.error('Error recording move:', moveError);
        setError('Failed to play cards: ' + moveError.message);
        return;
      }
      
      // Update cards to be in play zone
      const { error: cardsError } = await supabaseRef.current
        .from('cards')
        .update({ in_play_zone: true })
        .in('id', selectedCards.map(c => c.id));
        
      if (cardsError) {
        console.error('Error updating cards:', cardsError);
        setError('Failed to update cards: ' + cardsError.message);
        return;
      }
      
      // Find next player
      const playerIds = players.map(p => p.id);
      const currentIndex = playerIds.indexOf(currentPlayer.id);
      const nextIndex = (currentIndex + 1) % playerIds.length;
      const nextPlayerId = playerIds[nextIndex];
      
      // Update current player's turn status
      await supabaseRef.current
        .from('players')
        .update({ current_turn: false })
        .eq('id', currentPlayer.id);
        
      // Update next player's turn status
      await supabaseRef.current
        .from('players')
        .update({ current_turn: true })
        .eq('id', nextPlayerId);
      
      // Check if the player has won
      await checkForWinner();
      
      // Reset selection
      setSelectedCards([]);
      setClaimedValue('');
    } catch (error: any) {
      console.error('Error playing cards:', error);
      setError('Failed to play cards: ' + error.message);
    }
  };
  
  // Challenge the previous move
  const challengeMove = async () => {
    if (isYourTurn) return; // Can't challenge on your turn
    
    try {
      // Find current player
      const currentPlayer = players.find(p => p.user_id === user?.id);
      if (!currentPlayer) return;
      
      // Get the last move
      const { data: lastMoveData, error: moveError } = await supabaseRef.current
        .from('moves')
        .select('*')
        .eq('game_id', game.id)
        .eq('move_type', 'play')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (moveError || !lastMoveData) {
        console.error('Error getting last move:', moveError);
        setError('Failed to challenge: ' + (moveError?.message || 'No moves to challenge'));
        return;
      }
      
      // Get the cards from the last move
      const { data: lastMoveCards, error: cardsError } = await supabaseRef.current
        .from('cards')
        .select('*')
        .in('id', lastMoveData.cards_played);
        
      if (cardsError) {
        console.error('Error getting cards:', cardsError);
        setError('Failed to challenge: ' + cardsError.message);
        return;
      }
      
      // Check if the claim was true
      const allCardsMatch = lastMoveCards?.every(card => {
        const cardValue = card.value.replace(/[♥♦♣♠]/, ''); // Remove suit
        return cardValue === lastMoveData.claimed_value;
      });
      
      // Record the challenge
      const challengeId = crypto.randomUUID();
      const { error: challengeError } = await supabaseRef.current
        .from('moves')
        .insert({
          id: challengeId,
          game_id: game.id,
          player_id: currentPlayer.id,
          move_type: 'challenge',
          result: allCardsMatch ? 'pass' : 'fail', // If all cards match, challenge fails
          created_at: new Date().toISOString()
        });
        
      if (challengeError) {
        console.error('Error recording challenge:', challengeError);
        setError('Failed to challenge: ' + challengeError.message);
        return;
      }
      
      // Reveal the cards
      const { error: revealError } = await supabaseRef.current
        .from('cards')
        .update({ face_up: true })
        .in('id', lastMoveData.cards_played);
        
      if (revealError) {
        console.error('Error revealing cards:', revealError);
        setError('Failed to reveal cards: ' + revealError.message);
        return;
      }
      
      // Find the player who made the last move
      const lastMovePlayer = players.find(p => p.id === lastMoveData.player_id);
      
      // If challenge succeeds (cards don't match claim), move cards to last player
      // If challenge fails (cards match claim), move cards to challenger
      const targetPlayerId = allCardsMatch ? currentPlayer.id : lastMovePlayer?.id;
      
      if (targetPlayerId) {
        // Move cards from play zone to target player
        const { error: moveCardsError } = await supabaseRef.current
          .from('cards')
          .update({ 
            owner_player_id: targetPlayerId,
            in_play_zone: false,
            face_up: false
          })
          .in('id', lastMoveData.cards_played);
          
        if (moveCardsError) {
          console.error('Error moving cards:', moveCardsError);
          setError('Failed to move cards: ' + moveCardsError.message);
          return;
        }
      }
      
      // Check if any player has won
      await checkForWinner();
    } catch (error: any) {
      console.error('Error challenging move:', error);
      setError('Failed to challenge: ' + error.message);
    }
  };
  
  // Check if a player has won the game
  const checkForWinner = async () => {
    try {
      // Get all players and their cards
      const { data: playerData, error: playerError } = await supabaseRef.current
        .from('players')
        .select(`
          id,
          user_id,
          display_name,
          cards:cards(id)
        `)
        .eq('game_id', game.id)
        .eq('eliminated', false);
        
      if (playerError) {
        console.error('Error checking for winner:', playerError);
        return;
      }
      
      // Check if any player has no cards
      const winner = playerData?.find(player => player.cards.length === 0);
      
      if (winner) {
        // Update game status to complete
        await supabaseRef.current
          .from('games')
          .update({ 
            status: 'complete', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', game.id);
          
        // Create a game end log entry
        await supabaseRef.current
          .from('moves')
          .insert({
            id: crypto.randomUUID(),
            game_id: game.id,
            player_id: winner.id,
            move_type: 'game_end',
            result: 'win',
            created_at: new Date().toISOString()
          });
          
        // Update game log
        setGameLog(prev => [...prev, `${winner.display_name} has won the game!`]);
      }
    } catch (error: any) {
      console.error('Error checking for winner:', error);
    }
  };

  const startGame = async () => {
    try {
      // Check if user is the creator of the game
      if (game.created_by !== user.id) {
        setError('Only the game creator can start the game');
        return;
      }
      
      // Check if there are at least 2 players
      if (players.length < 2) {
        setError('Need at least 2 players to start the game');
        return;
      }
      
      console.log('Starting game:', game.id);
      
      // Update game status to active
      const { error: gameUpdateError } = await supabaseRef.current
        .from('games')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', game.id);
        
      if (gameUpdateError) {
        console.error('Error starting game:', gameUpdateError);
        setError('Failed to start game: ' + gameUpdateError.message);
        setDetailedError(gameUpdateError);
        return;
      }
      
      // Create a deck of cards
      const suits = ['♥', '♦', '♣', '♠'];
      const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const deck = [];
      
      // Generate the deck
      for (const suit of suits) {
        for (const value of values) {
          deck.push(`${value}${suit}`);
        }
      }
      
      // Shuffle the deck using Fisher-Yates algorithm
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      
      // Calculate cards per player
      const cardsPerPlayer = Math.floor(deck.length / players.length);
      
      // Deal cards to players
      const cardInserts = [];
      let cardIndex = 0;
      
      for (const player of players) {
        for (let i = 0; i < cardsPerPlayer; i++) {
          if (cardIndex < deck.length) {
            cardInserts.push({
              id: crypto.randomUUID(),
              game_id: game.id,
              owner_player_id: player.id,
              value: deck[cardIndex],
              face_up: false,
              in_play_zone: false
            });
            cardIndex++;
          }
        }
      }
      
      // Insert all cards
      const { error: cardsError } = await supabaseRef.current
        .from('cards')
        .insert(cardInserts);
        
      if (cardsError) {
        console.error('Error creating cards:', cardsError);
        setError('Failed to create cards: ' + cardsError.message);
        setDetailedError(cardsError);
        return;
      }
      
      // Set the first player's turn
      const firstPlayer = players[0];
      const { error: playerUpdateError } = await supabaseRef.current
        .from('players')
        .update({ current_turn: true })
        .eq('id', firstPlayer.id);
        
      if (playerUpdateError) {
        console.error('Error setting first player:', playerUpdateError);
        setError('Failed to set first player: ' + playerUpdateError.message);
        setDetailedError(playerUpdateError);
        return;
      }
      
      // Create a game start log entry
      const { error: moveError } = await supabaseRef.current
        .from('moves')
        .insert({
          id: crypto.randomUUID(),
          game_id: game.id,
          player_id: null,
          move_type: 'game_start',
          created_at: new Date().toISOString()
        });
        
      if (moveError) {
        console.error('Error creating game start log:', moveError);
        // Non-critical error, continue
      }
      
      console.log('Game started successfully');
    } catch (error: any) {
      console.error('Error in startGame:', error);
      setError('Failed to start game: ' + error.message);
      setDetailedError(error);
    }
  };
  
  const leaveGame = async () => {
    try {
      // Find the current player
      const currentPlayer = players.find(p => p.user_id === user.id);
      
      if (!currentPlayer) {
        console.log('Player not found in this game, redirecting to lobby');
        router.push('/game/lobby');
        return;
      }
      
      console.log('Leaving game, removing player:', currentPlayer.id);
      // Delete the player from the game
      const { error } = await supabaseRef.current
        .from('players')
        .delete()
        .eq('id', currentPlayer.id);
        
      if (error) {
        console.error('Error leaving game:', error);
        setError('Failed to leave game: ' + error.message);
        setDetailedError(error);
        return;
      }
      
      // Check if this was the last player in the game
      const { data: remainingPlayers, error: countError } = await supabaseRef.current
        .from('players')
        .select('id')
        .eq('game_id', game.id);
        
      if (!countError && (!remainingPlayers || remainingPlayers.length === 0)) {
        console.log('Last player left the game, cleaning up game:', game.id);
        await cleanupEmptyGame(game.id);
      }
      
      console.log('Successfully left game, redirecting to lobby');
      router.push('/game/lobby');
    } catch (error: any) {
      console.error('Error in leaveGame:', error);
      setError('Failed to leave game: ' + error.message);
      setDetailedError(error);
    }
  };
  
  // Function to clean up an empty game
  const cleanupEmptyGame = async (gameId: string) => {
    try {
      console.log('Cleaning up empty game:', gameId);
      
      // Delete all cards associated with this game
      const { error: cardsError } = await supabaseRef.current
        .from('cards')
        .delete()
        .eq('game_id', gameId);
        
      if (cardsError) {
        console.error('Error deleting cards:', cardsError);
      }
      
      // Delete all moves associated with this game
      const { error: movesError } = await supabaseRef.current
        .from('moves')
        .delete()
        .eq('game_id', gameId);
        
      if (movesError) {
        console.error('Error deleting moves:', movesError);
      }
      
      // Finally delete the game itself
      const { error: gameError } = await supabaseRef.current
        .from('games')
        .delete()
        .eq('id', gameId);
        
      if (gameError) {
        console.error('Error deleting game:', gameError);
      }
      
      console.log('Game cleanup complete');
    } catch (error: any) {
      console.error('Error cleaning up empty game:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading game...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-lg w-full">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          {detailedError && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm">Technical details</summary>
              <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(detailedError, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <button 
          onClick={() => router.push('/game/lobby')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Lobby
        </button>
      </div>
    );
  }
  
  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="mb-4">Game not found</p>
        <button 
          onClick={() => router.push('/game/lobby')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Lobby
        </button>
      </div>
    );
  }
  
  const currentPlayer = players.find(p => p.user_id === user?.id);
  const isCreator = game.created_by === user?.id;
  
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Game: {game.code}</h1>
            <span className={`px-3 py-1 rounded text-sm ${
              game.status === 'lobby' ? 'bg-yellow-100 text-yellow-800' : 
              game.status === 'active' ? 'bg-green-100 text-green-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {game.status.toUpperCase()}
            </span>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Players ({players.length}/8):</h2>
            <ul className="space-y-2">
              {players.map(player => (
                <li 
                  key={player.id}
                  className={`p-2 rounded-md ${player.user_id === user?.id ? 'bg-blue-100' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center">
                    <span className="font-medium">{player.display_name}</span>
                    {game.created_by === player.user_id && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Host
                      </span>
                    )}
                    {player.user_id === user?.id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        You
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {game.status === 'lobby' && (
            <div className="flex space-x-4">
              {isCreator && (
                <button
                  onClick={startGame}
                  disabled={players.length < 2}
                  className={`px-4 py-2 rounded-md ${
                    players.length < 2 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Start Game
                </button>
              )}
              
              <button
                onClick={leaveGame}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Leave Game
              </button>
              
              <button
                onClick={() => router.push('/game/lobby')}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Back to Lobby
              </button>
            </div>
          )}
          
          {game.status === 'active' && (
            <div className="space-y-6">
              <GameLog logs={gameLog} />
              
              {!isYourTurn && (
                <WaitingScreen 
                  currentPlayerName={players.find(p => p.current_turn)?.display_name || 'another player'} 
                />
              )}
              
              <PlayZone cards={playZoneCards} />
              <PlayerHand 
                cards={cards}
                isYourTurn={isYourTurn}
                onPlayCards={(selectedCards, claimedValue) => {
                  playCards(selectedCards, claimedValue);
                }}
                onChallenge={challengeMove}
              />
            </div>
          )}
          
          {game.status === 'complete' && (
            <GameOver winner={gameLog.find(log => log.includes('has won the game'))?.split(' has')[0] || 'Someone'} />
          )}
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Game Information</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Game ID:</span> {game.id}</p>
            <p><span className="font-medium">Game Code:</span> {game.code}</p>
            <p><span className="font-medium">Created:</span> {new Date(game.created_at).toLocaleString()}</p>
            <p><span className="font-medium">Last Updated:</span> {new Date(game.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 