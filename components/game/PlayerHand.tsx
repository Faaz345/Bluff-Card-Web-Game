import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/lib/store/gameStore';
import { cn } from '@/lib/utils';
import type { Card as CardType } from '@/lib/store/gameStore';

interface PlayerHandProps {
  onPlayCards: (selectedCards: CardType[], claimedValue: string) => void;
  onChallenge: () => void;
  canChallenge: boolean;
}

const cardValues = [
  { value: 'A', label: 'Ace' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: 'J', label: 'Jack' },
  { value: 'Q', label: 'Queen' },
  { value: 'K', label: 'King' },
];

export default function PlayerHand({ onPlayCards, onChallenge, canChallenge }: PlayerHandProps) {
  const [claimedValue, setClaimedValue] = useState('');
  
  const {
    playerCards,
    selectedCards,
    toggleCardSelection,
    clearSelectedCards,
    isMyTurn,
    challengeInProgress,
    loading,
  } = useGameStore();

  const handlePlayCards = async () => {
    if (selectedCards.length === 0 || !claimedValue) return;
    
    try {
      await onPlayCards(selectedCards, claimedValue);
      setClaimedValue('');
      clearSelectedCards();
    } catch (error) {
      console.error('Failed to play cards:', error);
    }
  };

  const handleChallenge = async () => {
    try {
      await onChallenge();
    } catch (error) {
      console.error('Failed to challenge:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hand Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-game-surface to-slate-800 rounded-2xl p-6 shadow-game border border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-white">Your Hand</h3>
            <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm">
              {playerCards.length} cards
            </span>
          </div>
          
          <div className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            isMyTurn 
              ? 'bg-game-success text-white animate-pulse' 
              : 'bg-slate-700 text-slate-300'
          )}>
            {isMyTurn ? '🎯 Your Turn' : '⏳ Waiting'}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="mb-6">
          {playerCards.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center">
              <AnimatePresence>
                {playerCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20, rotateY: 180 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      rotateY: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      value={card.value}
                      faceUp={true}
                      selected={selectedCards.some(c => c.id === card.id)}
                      onClick={() => isMyTurn && toggleCardSelection(card)}
                      disabled={!isMyTurn || loading.makingMove}
                      size="md"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-slate-400 mb-2">🃏</div>
              <p className="text-slate-400">No cards in your hand</p>
            </motion.div>
          )}
        </div>

        {/* Action Controls */}
        <div className="border-t border-slate-700 pt-6">
          {isMyTurn ? (
            <div className="space-y-4">
              {/* Selection Info */}
              {selectedCards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-700/50 rounded-lg p-3"
                >
                  <p className="text-slate-300 text-sm">
                    Selected: {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}
                  </p>
                </motion.div>
              )}

              {/* Play Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Claim Value
                  </label>
                  <select
                    value={claimedValue}
                    onChange={(e) => setClaimedValue(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-game-accent focus:border-transparent"
                    disabled={loading.makingMove}
                  >
                    <option value="">Select a value...</option>
                    {cardValues.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handlePlayCards}
                  disabled={selectedCards.length === 0 || !claimedValue}
                  loading={loading.makingMove}
                  variant="primary"
                  size="lg"
                  className="sm:w-auto w-full"
                >
                  Play {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              {canChallenge && (
                <Button
                  onClick={handleChallenge}
                  loading={challengeInProgress}
                  variant="danger"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  🚨 Challenge Last Move
                </Button>
              )}
              
              {!canChallenge && (
                <div className="text-center">
                  <p className="text-slate-400 mb-2">Waiting for other players...</p>
                  <div className="flex justify-center space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-game-accent rounded-full"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
} 