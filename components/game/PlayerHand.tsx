import React, { useState } from 'react';
import Card from './Card';

interface PlayerHandProps {
  cards: any[];
  isYourTurn: boolean;
  onPlayCards: (selectedCards: any[], claimedValue: string) => void;
  onChallenge: () => void;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ 
  cards, 
  isYourTurn, 
  onPlayCards, 
  onChallenge 
}) => {
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [claimedValue, setClaimedValue] = useState<string>('');
  
  // Toggle card selection
  const toggleCardSelection = (card: any) => {
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };
  
  // Handle playing cards
  const handlePlayCards = () => {
    if (selectedCards.length > 0 && claimedValue) {
      onPlayCards(selectedCards, claimedValue);
      setSelectedCards([]);
      setClaimedValue('');
    }
  };
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Your Hand</h2>
        <span className={`px-3 py-1 rounded text-sm ${isYourTurn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {isYourTurn ? 'Your Turn' : 'Waiting'}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {cards.length > 0 ? (
          cards.map(card => (
            <Card 
              key={card.id}
              value={card.value}
              faceUp={true}
              selected={selectedCards.some(c => c.id === card.id)}
              onClick={() => isYourTurn && toggleCardSelection(card)}
            />
          ))
        ) : (
          <p className="text-gray-500 py-4">No cards in your hand</p>
        )}
      </div>
      
      {isYourTurn ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <label className="font-medium">Claim Value:</label>
            <select 
              value={claimedValue} 
              onChange={(e) => setClaimedValue(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="">Select value</option>
              <option value="A">Ace</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="J">Jack</option>
              <option value="Q">Queen</option>
              <option value="K">King</option>
            </select>
            
            <button
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || !claimedValue}
              className={`px-4 py-1 rounded-md ${
                selectedCards.length === 0 || !claimedValue
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Play Cards
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            Selected: {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <button
            onClick={onChallenge}
            className="px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Challenge Last Move
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerHand; 