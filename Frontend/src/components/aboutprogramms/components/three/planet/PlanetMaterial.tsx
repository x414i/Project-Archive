import { PROFILE } from '../../../config/profile.ts';
import React from 'react';

export const PlanetMaterial = () => (
  <meshStandardMaterial
    color={PROFILE.planet.color}
    metalness={PROFILE.planet.metalness}
    roughness={PROFILE.planet.roughness}
    emissive={PROFILE.planet.emissive}
    emissiveIntensity={PROFILE.planet.emissiveIntensity}
  />
);