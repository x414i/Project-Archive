import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface RotationOptions {
  speed?: number;
  axis?: 'x' | 'y' | 'z';
}

export const useRotation = <T extends THREE.Object3D>({ 
  speed = 0.002, 
  axis = 'y' 
}: RotationOptions = {}) => {
  const ref = useRef<T>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation[axis] += speed;
    }
  });

  return ref;
};