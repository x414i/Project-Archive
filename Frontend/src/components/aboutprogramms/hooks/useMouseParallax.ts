import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface ParallaxOptions {
  intensity?: number;
  smoothness?: number;
}

export const useMouseParallax = <T extends THREE.Object3D>({ 
  intensity = 0.1, 
  smoothness = 0.1 
}: ParallaxOptions = {}) => {
  const ref = useRef<T>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const currentMouse = useRef(new THREE.Vector2());

  useFrame(({ mouse }) => {
    if (!ref.current) return;

    currentMouse.current.x += (mouse.x - currentMouse.current.x) * smoothness;
    currentMouse.current.y += (mouse.y - currentMouse.current.y) * smoothness;

    targetPosition.current.set(
      currentMouse.current.x * intensity,
      currentMouse.current.y * intensity,
      0
    );

    ref.current.position.lerp(targetPosition.current, smoothness);
  });

  return ref;
};