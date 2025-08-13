import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Github, Linkedin, Twitter } from 'lucide-react';
import React from 'react';
const SOCIAL_LINKS = [
  { Icon: Github, url: 'https://github.com/ahmedali12311', color: '#333' },
  { Icon: Linkedin, url: 'https://www.linkedin.com/in/أحمد-علي-5076a3171/', color: '#0077b5' },
  { Icon: Twitter, url: 'https://x.com/oG_Jughead', color: '#1da1f2' },
];

export const SocialOrbit = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {SOCIAL_LINKS.map((social, index) => {
        const angle = (index * Math.PI * 2) / SOCIAL_LINKS.length;
        const radius = 4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <Html key={social.url} position={[x, 0, z]} center>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              style={{ color: social.color }}
            >
              <social.Icon size={24} />
            </a>
          </Html>
        );
      })}
    </group>
  );
};