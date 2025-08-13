import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SOCIAL_LINKS } from '../../config/social.ts';
import { SocialLink } from './SocialLink.tsx';
import React from 'react';
export const SocialOrbit = () => {
  const groupRef = useRef<THREE.Group>(null);
  const orbitRefs = useRef<THREE.Group[]>([]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    SOCIAL_LINKS.forEach((link, index) => {
      if (orbitRefs.current[index]) {
        orbitRefs.current[index].rotation.y = 
          clock.getElapsedTime() * link.orbitSpeed;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {SOCIAL_LINKS.map((link, index) => (
        <group 
          key={link.url}
          ref={el => el && (orbitRefs.current[index] = el)}
        >
          <SocialLink
            link={link}
            position={[link.orbitRadius, 0, 0]}
          />
        </group>
      ))}
    </group>
  );
};