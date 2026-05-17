import React, { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
  onComplete?: () => void;
}

export function ConfettiEffect({ active, duration = 3000, onComplete }: ConfettiEffectProps) {
  const [isActive, setIsActive] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    if (active) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration, onComplete]);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isActive) return null;

  return (
    <ReactConfetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.2}
      colors={['#f97316', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']}
      confettiSource={{
        x: windowDimensions.width / 2,
        y: windowDimensions.height / 3,
        w: 0,
        h: 0
      }}
    />
  );
}