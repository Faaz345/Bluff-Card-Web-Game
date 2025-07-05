import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: 'bg-game-accent hover:bg-blue-600 text-white shadow-md',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 shadow-sm',
  danger: 'bg-game-danger hover:bg-red-600 text-white shadow-md',
  success: 'bg-game-success hover:bg-green-600 text-white shadow-md',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    disabled,
    children, 
    ...props 
  }, ref) => {
    return (
      <motion.div
        whileHover={disabled || loading ? {} : { scale: 1.02 }}
        whileTap={disabled || loading ? {} : { scale: 0.98 }}
        className="inline-block"
      >
        <button
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-game-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            variants[variant],
            sizes[size],
            className
          )}
          disabled={disabled || loading}
          {...props}
        >
          {loading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {children}
        </button>
      </motion.div>
    );
  }
);

Button.displayName = 'Button';