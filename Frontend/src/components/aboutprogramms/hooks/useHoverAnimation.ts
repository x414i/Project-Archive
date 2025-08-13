import { useState, useCallback } from 'react';
import { useSpring } from 'framer-motion';

interface HoverAnimationOptions {
  scale?: number;
  duration?: number;
}

export const useHoverAnimation = ({ 
  scale = 1.2, 
  duration = 0.3 
}: HoverAnimationOptions = {}) => {
  const [isHovered, setIsHovered] = useState(false);
  const scaleSpring = useSpring(1, {
    stiffness: 300,
    damping: 30,
    duration
  });

  const handleHoverStart = useCallback(() => {
    setIsHovered(true);
    scaleSpring.set(scale);
  }, [scale, scaleSpring]);

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false);
    scaleSpring.set(1);
  }, [scaleSpring]);

  return {
    isHovered,
    scaleSpring,
    handleHoverStart,
    handleHoverEnd
  };
};