import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Database } from '../supabase/client';

export type Player = Database['public']['Tables']['players']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Card = Database['public']['Tables']['cards']['Row'];
export type Move = Database['public']['Tables']['moves']['Row'];

export interface GameWithPlayers extends Game {
  players: Player[];
}

interface GameState {
  // Current game data
  currentGame: GameWithPlayers | null;
  currentPlayer: Player | null;
  playerCards: Card[];
  playZoneCards: Card[];
  allPlayers: Player[];
  gameLog: Move[];
  
  // UI state
  selectedCards: Card[];
  isMyTurn: boolean;
  lastMove: Move | null;
  challengeInProgress: boolean;
  gameError: string | null;
  
  // Loading states
  loading: {
    joiningGame: boolean;
    creatingGame: boolean;
    makingMove: boolean;
    challenging: boolean;
  };
}

interface GameActions {
  // Game actions
  setCurrentGame: (game: GameWithPlayers | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setPlayerCards: (cards: Card[]) => void;
  setPlayZoneCards: (cards: Card[]) => void;
  setAllPlayers: (players: Player[]) => void;
  addGameLogEntry: (move: Move) => void;
  setGameLog: (log: Move[]) => void;
  
  // UI actions
  toggleCardSelection: (card: Card) => void;
  clearSelectedCards: () => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setLastMove: (move: Move | null) => void;
  setChallengeInProgress: (inProgress: boolean) => void;
  setGameError: (error: string | null) => void;
  
  // Loading actions
  setLoading: (key: keyof GameState['loading'], value: boolean) => void;
  
  // Reset actions
  resetGameState: () => void;
}

const initialState: GameState = {
  currentGame: null,
  currentPlayer: null,
  playerCards: [],
  playZoneCards: [],
  allPlayers: [],
  gameLog: [],
  selectedCards: [],
  isMyTurn: false,
  lastMove: null,
  challengeInProgress: false,
  gameError: null,
  loading: {
    joiningGame: false,
    creatingGame: false,
    makingMove: false,
    challenging: false,
  },
};

export const useGameStore = create<GameState & GameActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Game actions
    setCurrentGame: (game) => set({ currentGame: game }),
    setCurrentPlayer: (player) => set({ currentPlayer: player }),
    setPlayerCards: (cards) => set({ playerCards: cards }),
    setPlayZoneCards: (cards) => set({ playZoneCards: cards }),
    setAllPlayers: (players) => set({ allPlayers: players }),
    addGameLogEntry: (move) => set((state) => ({ 
      gameLog: [move, ...state.gameLog].slice(0, 50) // Keep only last 50 moves
    })),
    setGameLog: (log) => set({ gameLog: log }),

    // UI actions
    toggleCardSelection: (card) => set((state) => {
      const isSelected = state.selectedCards.some(c => c.id === card.id);
      if (isSelected) {
        return { selectedCards: state.selectedCards.filter(c => c.id !== card.id) };
      } else {
        return { selectedCards: [...state.selectedCards, card] };
      }
    }),
    clearSelectedCards: () => set({ selectedCards: [] }),
    setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
    setLastMove: (move) => set({ lastMove: move }),
    setChallengeInProgress: (inProgress) => set({ challengeInProgress: inProgress }),
    setGameError: (error) => set({ gameError: error }),

    // Loading actions
    setLoading: (key, value) => set((state) => ({
      loading: { ...state.loading, [key]: value }
    })),

    // Reset actions
    resetGameState: () => set(initialState),
  }))
);

// Selectors for common derived state
export const useCurrentPlayerTurn = () => useGameStore((state) => {
  if (!state.currentPlayer || !state.allPlayers.length) return false;
  return state.allPlayers.find(p => p.current_turn)?.id === state.currentPlayer.id;
});

export const usePlayerCount = () => useGameStore((state) => state.allPlayers.length);
export const useSelectedCardCount = () => useGameStore((state) => state.selectedCards.length);
export const useIsGameActive = () => useGameStore((state) => state.currentGame?.status === 'active');
export const useIsGameInLobby = () => useGameStore((state) => state.currentGame?.status === 'lobby');