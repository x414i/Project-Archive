import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls, Preload } from '@react-three/drei';
import { Planet } from './planet/Planet.tsx';
import { SocialOrbit } from './SocialOrbit.tsx';
import { Lights } from './Lights.tsx';
import { SpaceParticles } from './SpaceParticles.tsx';
import { Suspense } from 'react';
import React from 'react';

export const SpaceScene = () => (
  <Canvas
    camera={{ position: [0, 0, 10], fov: 75 }}
    dpr={[1, 2]}
    gl={{ antialias: true }}
  >
    <Suspense fallback={null}>
      <color attach="background" args={['#000']} />
      <fog attach="fog" args={['#000', 20, 40]} />
      <Lights />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <SpaceParticles />
      <Planet />
      <SocialOrbit />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
      <Preload all />
    </Suspense>
  </Canvas>
);