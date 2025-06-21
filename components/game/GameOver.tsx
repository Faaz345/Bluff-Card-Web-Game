import React from 'react';
import { useRouter } from 'next/navigation';

interface GameOverProps {
  winner: string;
}

const GameOver: React.FC<GameOverProps> = ({ winner }) => {
  const router = useRouter();
  
  return (
    <div className="text-center p-8 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
      <p className="text-xl mb-6">{winner} has won the game!</p>
      <div className="space-y-4">
        <p className="text-gray-600">Thank you for playing!</p>
        <button
          onClick={() => router.push('/game/lobby')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default GameOver; 