import { motion } from 'framer-motion';
import { cn, getCardColor, getCardDisplayValue, getCardSuit } from '@/lib/utils';

interface CardProps {
  value?: string;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-16',
  md: 'w-16 h-22',
  lg: 'w-20 h-28',
};

export default function Card({ 
  value = '', 
  faceUp = false, 
  selected = false, 
  onClick, 
  disabled = false,
  size = 'md',
  className 
}: CardProps) {
  const isRed = value ? getCardColor(value) === 'red' : false;
  const displayValue = value ? getCardDisplayValue(value) : '';
  const suit = value ? getCardSuit(value) : '';
  
  return (
    <motion.div
      className={cn(
        'relative cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      whileHover={!disabled ? { y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={{
        y: selected ? -8 : 0,
        scale: selected ? 1.05 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={!disabled ? onClick : undefined}
    >
      <div
        className={cn(
          sizeClasses[size],
          'relative rounded-lg border-2 shadow-card transition-all duration-200',
          faceUp
            ? 'bg-white border-gray-300'
            : 'bg-gradient-to-br from-card-back to-blue-800 border-blue-700',
          selected && 'ring-2 ring-game-accent ring-offset-2',
          !disabled && 'hover:shadow-card-hover'
        )}
      >
        {/* Card Back Design */}
        {!faceUp && (
          <div className="absolute inset-1 rounded bg-blue-600 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white rounded-full bg-blue-400 opacity-70" />
          </div>
        )}
        
        {/* Card Front */}
        {faceUp && value && (
          <>
            {/* Top left corner */}
            <div className={cn(
              'absolute top-1 left-1 text-xs font-bold leading-none',
              isRed ? 'text-card-red' : 'text-card-black'
            )}>
              <div>{displayValue}</div>
              <div className="text-xs">{suit}</div>
            </div>
            
            {/* Center suit */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn(
                'text-2xl font-bold',
                isRed ? 'text-card-red' : 'text-card-black'
              )}>
                {suit}
              </span>
            </div>
            
            {/* Bottom right corner (rotated) */}
            <div className={cn(
              'absolute bottom-1 right-1 text-xs font-bold leading-none transform rotate-180',
              isRed ? 'text-card-red' : 'text-card-black'
            )}>
              <div>{displayValue}</div>
              <div className="text-xs">{suit}</div>
            </div>
          </>
        )}
        
        {/* Selection indicator */}
        {selected && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 bg-game-accent rounded-full border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          />
        )}
      </div>
    </motion.div>
  );
} 