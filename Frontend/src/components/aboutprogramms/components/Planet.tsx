import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

export const Planet = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#4a90e2"
          metalness={0.5}
          roughness={0.5}
          emissive="#0a2472"
          emissiveIntensity={0.2}
        />
      </Sphere>
      <Text
        position={[0, 3, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        John Doe
      </Text>
      <Text
        position={[0, 2.3, 0]}
        fontSize={0.3}
        color="#4a90e2"
        anchorX="center"
        anchorY="middle"
      >
        Full Stack Developer
      </Text>
    </group>
  );
};