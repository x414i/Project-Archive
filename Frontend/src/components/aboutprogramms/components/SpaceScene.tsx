import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { Planet } from './Planet';
import { SocialOrbit } from './SocialOrbit';
import React from 'react';

export const SpaceScene = () => {
  return (
    <Canvas camera={{ position: [0, 0, 10] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Planet />
      <SocialOrbit />
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
};