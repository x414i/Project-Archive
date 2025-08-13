import { useTexture } from '@react-three/drei';
import React from 'react';
import { PROFILE } from '../../../config/profile.ts';

export const PlanetImage = () => {
  const texture = useTexture(PROFILE.image);
  
  return (
    <meshStandardMaterial
      map={texture}
      metalness={0.5}
      roughness={0.5}
      emissiveMap={texture}
      emissiveIntensity={0.2}
      transparent
      opacity={0.9}
    />
  );
};