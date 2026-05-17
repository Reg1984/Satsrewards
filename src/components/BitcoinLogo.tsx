import { cn } from '../lib/utils';

interface BitcoinLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BitcoinLogo({ className, size = 'md' }: BitcoinLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-sm',
    md: 'h-8 w-8 text-lg',
    lg: 'h-10 w-10 text-2xl'
  };

  return (
    <div className={cn(
      'relative inline-flex items-center justify-center', 
      className
    )}>
      <Circle className={cn('text-orange-500', sizeClasses[size])} />
      <span 
        className={cn(
          'absolute font-bold text-orange-500 transform -translate-y-[2px]',
          size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'
        )}
      >
        ₿
      </span>
    </div>
  );
}

// Circle component for the background
function Circle({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}