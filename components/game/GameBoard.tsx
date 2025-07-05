import { motion, AnimatePresence } from 'framer-motion';
import PlayerHand from './PlayerHand';
import PlayZone from './PlayZone';
import GameLog from './GameLog';
import PlayerList from './PlayerList';
import { useGameStore } from '@/lib/store/gameStore';
import { useState } from 'react';
import type { Card } from '@/lib/store/gameStore';

interface GameBoardProps {
  gameId: string;
  onPlayCards: (cards: Card[], claimedValue: string) => Promise<void>;
  onChallenge: () => Promise<void>;
}

export default function GameBoard({ gameId, onPlayCards, onChallenge }: GameBoardProps) {
  const [showLog, setShowLog] = useState(false);
  
  const {
    currentGame,
    allPlayers,
    playZoneCards,
    lastMove,
    gameError,
    currentPlayer,
  } = useGameStore();

  const canChallenge = Boolean(
    lastMove && 
    lastMove.move_type === 'play' && 
    lastMove.player_id !== currentPlayer?.id &&
    currentGame?.status === 'active'
  );

  if (!currentGame) {
    return (
      <div className="min-h-screen bg-game-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-background via-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-game-surface/80 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">Bluff Game</h1>
            <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
              Room: {currentGame.code}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowLog(!showLog)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              {showLog ? 'Hide Log' : 'Show Log'}
            </button>
            <div className="text-slate-300 text-sm">
              {allPlayers.length} player{allPlayers.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      <AnimatePresence>
        {gameError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-600 text-white px-4 py-3 text-center"
          >
            <p>{gameError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players Sidebar */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="lg:col-span-1"
          >
            <PlayerList />
          </motion.div>

          {/* Main Play Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Play Zone */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <PlayZone />
            </motion.div>

            {/* Player Hand */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <PlayerHand
                onPlayCards={onPlayCards}
                onChallenge={onChallenge}
                canChallenge={canChallenge}
              />
            </motion.div>
          </div>

          {/* Game Log Sidebar */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`lg:col-span-1 ${!showLog ? 'hidden lg:block' : ''}`}
          >
            <GameLog />
          </motion.div>
        </div>
      </div>

      {/* Mobile Log Overlay */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end"
            onClick={() => setShowLog(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-game-surface rounded-t-2xl p-4 max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-slate-600 rounded mx-auto mb-4" />
              <GameLog />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}