import { Text } from '@react-three/drei';
import { PROFILE } from '../../../config/profile.ts';
import React from 'react';

export const PlanetText = () => (
  <group position={[0, 3.5, 0]}>
    <Text
      position={[0, 0, 0]}
      fontSize={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#4a90e2"
    >
      {PROFILE.name}
    </Text>
    <Text
      position={[0, -0.7, 0]}
      fontSize={0.3}
      color="#4a90e2"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.01}
      outlineColor="white"
    >
      {PROFILE.title}
    </Text>
  </group>
);