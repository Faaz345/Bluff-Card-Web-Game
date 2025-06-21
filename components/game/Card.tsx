import React from 'react';

interface CardProps {
  value: string;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ value, faceUp = true, selected = false, onClick }) => {
  // Determine if the card is red (hearts or diamonds)
  const isRed = value.includes('♥') || value.includes('♦');
  
  return (
    <div 
      onClick={onClick}
      className={`
        w-12 h-16 
        ${faceUp ? 'bg-white' : 'bg-blue-500'} 
        border 
        ${selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}
        rounded-md flex items-center justify-center shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
    >
      {faceUp ? (
        <span className={`text-lg font-medium ${isRed ? 'text-red-600' : 'text-black'}`}>
          {value}
        </span>
      ) : (
        <div className="w-full h-full bg-blue-500 rounded-md"></div>
      )}
    </div>
  );
};

export default Card; 