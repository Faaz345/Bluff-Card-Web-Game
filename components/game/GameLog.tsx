import React from 'react';

interface GameLogProps {
  logs: string[];
}

const GameLog: React.FC<GameLogProps> = ({ logs }) => {
  // Create a reference to scroll to the bottom
  const logEndRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when logs update
  React.useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-semibold mb-2">Game Log</h2>
      <div className="bg-white rounded-md p-3 h-40 overflow-y-auto">
        {logs.length > 0 ? (
          <ul className="space-y-1">
            {logs.map((log, index) => (
              <li 
                key={index} 
                className="text-sm py-1 border-b border-gray-100 last:border-b-0"
              >
                {log}
              </li>
            ))}
            <div ref={logEndRef} />
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">Game started. No moves yet.</p>
        )}
      </div>
    </div>
  );
};

export default GameLog; 