import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import React from 'react';

export const PlanetRings = () => {
  const ringsRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.PI / 3;
      ringsRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <mesh ref={ringsRef}>
      <ringGeometry args={[3, 3.6, 64]} />
      <meshPhongMaterial
        color="#4a90e2"
        side={THREE.DoubleSide}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};