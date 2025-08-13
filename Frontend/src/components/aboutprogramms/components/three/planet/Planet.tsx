import { Sphere } from '@react-three/drei';
import { useRotation } from '../../../hooks/useRotation.ts';
import { PlanetImage } from './PlanetImage.tsx';
import { PlanetAtmosphere } from './PlanetAtmosphere.tsx';
import { PlanetRings } from './PlanetRings.tsx';
import { PlanetText } from './PlanetText.tsx';
import { PlanetParticles } from './PlanetParticles.tsx';
import React from 'react';
import * as THREE from 'three';

export const Planet = () => {
  const planetRef = useRotation<THREE.Mesh>({ speed: 0.001 });

  return (
    <group>
      {/* Main Planet Sphere */}
      <Sphere ref={planetRef} args={[2, 64, 64]}>
        <PlanetImage />
      </Sphere>

      {/* Atmospheric Effects */}
      <PlanetAtmosphere />
      <PlanetRings />
      <PlanetParticles />

      {/* Text Labels */}
      <PlanetText />
    </group>
  );
};