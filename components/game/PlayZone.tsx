import React from 'react';
import Card from './Card';

interface PlayZoneProps {
  cards: any[];
}

const PlayZone: React.FC<PlayZoneProps> = ({ cards }) => {
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Play Zone</h2>
      <div className="flex flex-wrap gap-2 min-h-16 bg-green-100 p-4 rounded-md">
        {cards.length > 0 ? (
          cards.map(card => (
            <Card 
              key={card.id} 
              value={card.value}
              faceUp={card.face_up}
            />
          ))
        ) : (
          <p className="text-gray-500 py-4">No cards in play zone</p>
        )}
      </div>
    </div>
  );
};

export default PlayZone; 