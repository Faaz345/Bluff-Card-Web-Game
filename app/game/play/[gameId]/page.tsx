'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<any>(null);
  
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
      
      // Store subscriptions for cleanup
      subscriptionsRef.current = {
        gameSubscription,
        playersSubscription
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
      const { error } = await supabaseRef.current
        .from('games')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', game.id);
        
      if (error) {
        console.error('Error starting game:', error);
        setError('Failed to start game: ' + error.message);
        setDetailedError(error);
        return;
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
      
      console.log('Successfully left game, redirecting to lobby');
      router.push('/game/lobby');
    } catch (error: any) {
      console.error('Error in leaveGame:', error);
      setError('Failed to leave game: ' + error.message);
      setDetailedError(error);
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
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-xl">Game is in progress!</p>
              <p className="text-gray-500 mt-2">Game play UI will be implemented here</p>
            </div>
          )}
          
          {game.status === 'complete' && (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-xl">Game is complete!</p>
              <button
                onClick={() => router.push('/game/lobby')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Lobby
              </button>
            </div>
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