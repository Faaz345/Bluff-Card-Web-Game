'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';

// Define types for better TypeScript support
interface Player {
  id: string;
  user_id: string;
  game_id: string;
  display_name: string;
  seat: number;
  current_turn: boolean;
  eliminated: boolean;
}

interface Game {
  id: string;
  code: string;
  status: 'lobby' | 'active' | 'complete';
  created_by: string;
  created_at: string;
  updated_at: string;
  players?: Player[];
}

export default function GameLobbyPage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [showGames, setShowGames] = useState(false);
  const [showPublicGames, setShowPublicGames] = useState(true);
  
  // Use a ref to store the Supabase client to avoid recreation on re-renders
  const supabaseRef = useRef(getSupabaseClient());
  
  // Store subscription references to clean them up properly
  const subscriptionsRef = useRef<{ [key: string]: RealtimeChannel }>({});

  // Helper function to clear potentially corrupted storage
  const clearCorruptedStorage = () => {
    try {
      // Try to access localStorage to check for corruption
      const testKey = 'test_storage_access';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Check for any corrupted JSON in localStorage
      const authKey = 'supabase.auth.token';
      const storedAuth = localStorage.getItem(authKey);
      
      if (storedAuth) {
        try {
          // Try to parse the JSON to see if it's valid
          JSON.parse(storedAuth);
        } catch (parseError) {
          // If parsing fails, the JSON is corrupted, so remove it
          console.log('Removing corrupted auth data from localStorage');
          localStorage.removeItem(authKey);
        }
      }
    } catch (storageError) {
      console.error('Storage access error:', storageError);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking user authentication in lobby...');
        
        // Clear any potentially corrupted session data
        clearCorruptedStorage();
        
        const { data: { user }, error } = await supabaseRef.current.auth.getUser();
        
        if (error || !user) {
          console.log('User not authenticated, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        console.log('Current user:', user.email);
        setUser(user);
        fetchUserGames(user.id);
        fetchPublicGames();
        
        // Check for and clean up any empty games
        cleanupEmptyGames();
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Clean up subscriptions when component unmounts
    return () => {
      console.log('Cleaning up lobby subscriptions');
      Object.values(subscriptionsRef.current).forEach((subscription) => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      });
    };
  }, [router]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;
    
    // Clean up any existing subscriptions first
    if (subscriptionsRef.current.gamesSubscription) {
      subscriptionsRef.current.gamesSubscription.unsubscribe();
    }
    
    if (subscriptionsRef.current.playersSubscription) {
      subscriptionsRef.current.playersSubscription.unsubscribe();
    }
    
    console.log('Setting up real-time subscriptions for lobby...');
    
    // Subscribe to games table for real-time updates
    const gamesSubscription = supabaseRef.current
      .channel('lobby:games')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games' },
        (payload: any) => {
          console.log('Games change detected:', payload);
          fetchPublicGames();
          fetchUserGames(user.id);
        }
      )
      .subscribe((status: string) => {
        console.log('Games subscription status:', status);
      });
      
    // Subscribe to players table for real-time updates
    const playersSubscription = supabaseRef.current
      .channel('lobby:players')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' },
        (payload: any) => {
          console.log('Players change detected:', payload);
          fetchPublicGames();
          fetchUserGames(user.id);
        }
      )
      .subscribe((status: string) => {
        console.log('Players subscription status:', status);
      });
      
    // Store subscriptions for cleanup
    subscriptionsRef.current = {
      gamesSubscription,
      playersSubscription
    };
  }, [user]);

  // Fetch all public games in lobby state
  const fetchPublicGames = async () => {
    try {
      console.log('Fetching public games in lobby state...');
      // Get all games in lobby state
      const { data: lobbyGames, error: lobbyError } = await supabaseRef.current
        .from('games')
        .select(`
          id,
          code,
          status,
          created_by,
          created_at,
          updated_at,
          players:players(id, user_id, game_id, display_name, seat, current_turn, eliminated)
        `)
        .eq('status', 'lobby');
        
      if (lobbyError) {
        console.error('Error fetching public games:', lobbyError);
        return;
      }
      
      console.log('Fetched public games:', lobbyGames);
      setPublicGames(lobbyGames || []);
    } catch (err) {
      console.error('Error fetching public games:', err);
    }
  };

  // Fetch games the user is part of
  const fetchUserGames = async (userId: string) => {
    try {
      console.log('Fetching games for user:', userId);
      // First, check games created by the user
      const { data: createdGames, error: createdError } = await supabaseRef.current
        .from('games')
        .select(`
          id,
          code,
          status,
          created_by,
          created_at,
          updated_at
        `)
        .eq('created_by', userId);

      if (createdError) {
        console.error('Error fetching created games:', createdError);
        setGames([]);
        return;
      }

      console.log('Games created by user:', createdGames);

      // Then check games the user is playing in
      const { data: playerGames, error: playerError } = await supabaseRef.current
        .from('players')
        .select('id, game_id, user_id')
        .eq('user_id', userId);

      if (playerError) {
        console.error('Error fetching player games:', playerError);
        setGames(createdGames || []);
        return;
      }

      console.log('Games user is playing in:', playerGames);

      if (playerGames && playerGames.length > 0) {
        const gameIds = playerGames.map((pg: { game_id: string }) => pg.game_id);
        
        // Handle potential empty gameIds array
        if (gameIds.length === 0) {
          setGames(createdGames || []);
          return;
        }
        
        const { data: joinedGames, error: joinedError } = await supabaseRef.current
          .from('games')
          .select(`
            id,
            code,
            status,
            created_by,
            created_at,
            updated_at
          `)
          .in('id', gameIds);

        if (joinedError) {
          console.error('Error fetching joined games:', joinedError);
          setGames(createdGames || []);
          return;
        }
        
        console.log('Joined games data:', joinedGames);
        
        // Combine unique games
        const allGames = [...(createdGames || [])] as Game[];
        joinedGames?.forEach((game: Game) => {
          if (!allGames.some(g => g.id === game.id)) {
            allGames.push(game);
          }
        });
        
        console.log('All user games combined:', allGames);
        setGames(allGames);
      } else {
        setGames(createdGames || []);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setGames([]);
    }
  };

  // Create a new game
  const createGame = async () => {
    if (!displayName) {
      setError('Please enter a display name');
      return;
    }
    
    try {
      setActionInProgress(true);
      setError(null);
      setDetailedError(null);
      
      console.log('Creating new game...');
      // Generate a random 6-character game code
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const gameId = uuidv4();
      console.log('Generated game ID:', gameId);
      console.log('Generated game code:', generatedCode);
      
      // Create a new game in Supabase
      const { data: gameData, error: gameError } = await supabaseRef.current
        .from('games')
        .insert({
          id: gameId,
          code: generatedCode,
          status: 'lobby',
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (gameError) {
        console.error('Error creating game:', gameError);
        setError('Failed to create game: ' + gameError.message);
        setDetailedError(gameError);
        return;
      }

      console.log('Game created successfully:', gameData);

      // Add the current user as a player
      const { data: playerData, error: playerError } = await supabaseRef.current
        .from('players')
        .insert({
          id: uuidv4(),
          user_id: user?.id,
          game_id: gameId,
          display_name: displayName,
          seat: 0,
          current_turn: false,
          eliminated: false
        })
        .select();

      if (playerError) {
        console.error('Error adding player to game:', playerError);
        setError('Failed to join game: ' + playerError.message);
        setDetailedError(playerError);
        
        // Try to clean up the game if player creation failed
        try {
          await supabaseRef.current.from('games').delete().eq('id', gameId);
        } catch (cleanupError) {
          console.error('Failed to clean up game after player creation error:', cleanupError);
        }
        
        return;
      }
      
      console.log('Player added to game:', playerData);
      
      setGameCode(generatedCode);
      setError(null);
      
      // Update games list
      fetchUserGames(user.id);
      fetchPublicGames();
      
      console.log('Navigating to game page:', gameId);
      // Go directly to the game lobby
      router.push(`/game/play/${gameId}`);
    } catch (error: any) {
      console.error('Error in createGame:', error);
      setError('Failed to create game: ' + error.message);
      setDetailedError(error);
    } finally {
      setActionInProgress(false);
    }
  };

  // Join an existing game
  const joinGame = async () => {
    if (!gameCode || !displayName) {
      setError('Please enter a game code and display name');
      return;
    }

    try {
      setActionInProgress(true);
      setError(null);
      setDetailedError(null);
      
      console.log('Joining game with code:', gameCode);
      // Find the game by code
      const { data: gameData, error: gameError } = await supabaseRef.current
        .from('games')
        .select(`
          id,
          code,
          status,
          created_by,
          created_at,
          updated_at
        `)
        .eq('code', gameCode.toUpperCase())
        .eq('status', 'lobby');
        
      if (gameError) {
        console.error('Error finding game:', gameError);
        setError('Failed to find game: ' + gameError.message);
        setDetailedError(gameError);
        return;
      }
      
      if (!gameData || gameData.length === 0) {
        console.log('Game not found or already started');
        setError('Game not found or already started');
        return;
      }
      
      const game = gameData[0];
      console.log('Found game:', game);
      
      // Check if player is already in the game
      const { data: existingPlayer, error: existingPlayerError } = await supabaseRef.current
        .from('players')
        .select('id, user_id, game_id, display_name, seat, current_turn, eliminated')
        .eq('game_id', game.id)
        .eq('user_id', user?.id);
        
      if (existingPlayerError) {
        console.error('Error checking existing player:', existingPlayerError);
        setError('Failed to check player status: ' + existingPlayerError.message);
        setDetailedError(existingPlayerError);
        return;
      }
      
      if (existingPlayer && existingPlayer.length > 0) {
        console.log('Player already in game, navigating to game page');
        // Player is already in the game, just go to the game
        router.push(`/game/play/${game.id}`);
        return;
      }
      
      // Check if game is full
      const { data: players, error: playersError } = await supabaseRef.current
        .from('players')
        .select('id, user_id, game_id, display_name, seat, current_turn, eliminated')
        .eq('game_id', game.id);
        
      if (playersError) {
        console.error('Error checking player count:', playersError);
        setError('Failed to check player count: ' + playersError.message);
        setDetailedError(playersError);
        return;
      }
      
      if (players && players.length >= 8) {
        console.log('Game is full');
        setError('Game is full (max 8 players)');
        return;
      }
      
      console.log('Adding player to game...');
      // Add player to the game
      const { data: newPlayer, error: joinError } = await supabaseRef.current
        .from('players')
        .insert({
          id: uuidv4(),
          user_id: user?.id,
          game_id: game.id,
          display_name: displayName,
          seat: players ? players.length : 0,
          current_turn: false,
          eliminated: false
        })
        .select();
        
      if (joinError) {
        console.error('Error joining game:', joinError);
        setError('Failed to join game: ' + joinError.message);
        setDetailedError(joinError);
        return;
      }
      
      console.log('Player added successfully:', newPlayer);
      console.log('Navigating to game page:', game.id);
      
      // Go directly to the game
      router.push(`/game/play/${game.id}`);
    } catch (error: any) {
      console.error('Error in joinGame:', error);
      setError('Failed to join game: ' + error.message);
      setDetailedError(error);
    } finally {
      setActionInProgress(false);
    }
  };

  const goToGame = (gameId: string) => {
    console.log('Navigating to existing game:', gameId);
    router.push(`/game/play/${gameId}`);
  };

  const signOut = async () => {
    console.log('Signing out user');
    await supabaseRef.current.auth.signOut();
    router.push('/');
  };

  // Function to clean up empty games
  const cleanupEmptyGames = async () => {
    try {
      // Find games with no players
      const { data: emptyGames, error: gamesError } = await supabaseRef.current
        .from('games')
        .select('id, (players:players(count)))')
        .eq('status', 'lobby')
        .filter('players.count', 'eq', 0);
      
      if (gamesError) {
        console.error('Error finding empty games:', gamesError);
        return;
      }
      
      if (!emptyGames || emptyGames.length === 0) {
        return;
      }
      
      console.log(`Found ${emptyGames.length} empty games to clean up`);
      
      for (const game of emptyGames) {
        await cleanupEmptyGame(game.id);
      }
    } catch (error) {
      console.error('Error in cleanupEmptyGames:', error);
    }
  };
  
  // Function to clean up a single empty game
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
      
      console.log('Game cleanup complete for:', gameId);
    } catch (error) {
      console.error('Error cleaning up empty game:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Filter out games the user is already in from public games
  const availablePublicGames = publicGames.filter(
    publicGame => !games.some(userGame => userGame.id === publicGame.id)
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Game Lobby</h1>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">{user?.email}</span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.email}</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)} 
                  className="font-bold"
                >
                  &times;
                </button>
              </div>
              
              {detailedError && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Technical details</summary>
                  <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(detailedError, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter a display name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <button
                onClick={createGame}
                disabled={actionInProgress || !displayName}
                className={`w-full py-2 px-4 ${actionInProgress ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md ${!displayName ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {actionInProgress ? 'Creating...' : 'Create Game'}
              </button>
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter Game Code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={joinGame}
                disabled={actionInProgress || !gameCode || !displayName}
                className={`w-full py-2 px-4 ${actionInProgress ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md ${(!gameCode || !displayName) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {actionInProgress ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Available Games Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Available Games</h2>
            <button 
              onClick={() => setShowPublicGames(!showPublicGames)} 
              className="text-blue-600 hover:underline text-sm"
            >
              {showPublicGames ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showPublicGames && (
            availablePublicGames.length > 0 ? (
              <ul className="space-y-2">
                {availablePublicGames.map(game => (
                  <li key={game.id} className="border p-3 rounded-md hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Code: {game.code}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({game.players ? game.players.length : 0}/8 players)
                        </span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder="Enter name"
                          className="px-2 py-1 border border-gray-300 rounded-md mr-2 text-sm w-24"
                          onChange={(e) => setDisplayName(e.target.value)}
                          value={displayName}
                        />
                        <button 
                          onClick={() => {
                            setGameCode(game.code);
                            joinGame();
                          }}
                          disabled={!displayName}
                          className={`bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 ${!displayName ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No available games found.</p>
            )
          )}
        </div>
        
        {/* Your Games Section */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Games</h2>
            <button 
              onClick={() => setShowGames(!showGames)} 
              className="text-blue-600 hover:underline text-sm"
            >
              {showGames ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showGames && (
            games.length > 0 ? (
              <ul className="space-y-2">
                {games.map(game => (
                  <li key={game.id} className="border p-3 rounded-md hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Code: {game.code}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          game.status === 'lobby' ? 'bg-yellow-100 text-yellow-800' : 
                          game.status === 'active' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {game.status.toUpperCase()}
                        </span>
                      </div>
                      <button 
                        onClick={() => goToGame(game.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        {game.status === 'lobby' ? 'Go To Lobby' : 'Play'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">You don't have any games yet.</p>
            )
          )}
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">How to Play</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create a game and share the code with friends</li>
            <li>Each player gets dealt cards</li>
            <li>On your turn, play cards face down and claim their value</li>
            <li>Other players can challenge if they think you're bluffing</li>
            <li>First player to get rid of all cards wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 