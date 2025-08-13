import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface OrbitOptions {
  speed?: number;
}

export const useOrbitAnimation = ({ speed = 0.5 }: OrbitOptions = {}) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * speed;
    }
  });

  return ref;
};