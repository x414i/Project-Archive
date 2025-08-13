import { Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export const PlanetAtmosphere = () => {
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <Sphere ref={atmosphereRef} args={[2.1, 32, 32]} scale={1.02}>
      <meshPhongMaterial
        color="#4a90e2"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </Sphere>
  );
};