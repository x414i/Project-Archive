import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import React from 'react';
export const Lights = () => {
  const mainLight = useRef<THREE.DirectionalLight>(null);
  const rimLight = useRef<THREE.PointLight>(null);
  const fillLight = useRef<THREE.PointLight>(null);
  const extraFillLight = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (mainLight.current && rimLight.current && fillLight.current && extraFillLight.current) {
      const time = clock.getElapsedTime();
      mainLight.current.position.x = Math.sin(time * 0.5) * 3;
      mainLight.current.position.z = Math.cos(time * 0.5) * 3;
      rimLight.current.position.x = Math.cos(time * 0.5) * 4;
      rimLight.current.position.z = Math.sin(time * 0.5) * 4;
      fillLight.current.position.y = Math.sin(time * 0.5) * 2 + 2;
      extraFillLight.current.position.x = Math.sin(time * 0.5) * -3;
      extraFillLight.current.position.z = Math.cos(time * 0.5) * -3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} color="#ffffff" /> {/* Increased ambient light intensity */}
      <directionalLight
        ref={mainLight}
        position={[5, 5, 5]}
        intensity={2.5} // Adjusted intensity for main light
        castShadow
        shadow-mapSize-width={2048} // Higher resolution shadows
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight
        ref={rimLight}
        position={[-5, 2, -5]}
        intensity={1.5} // Adjusted intensity for rim light
        color="#ffcc00" // Warmer color for a more inviting feel
        decay={2}
      />
      <pointLight
        ref={fillLight}
        position={[5, 2, -5]} // Positioning the fill light
        intensity={1.0} // Adjusted intensity for fill light
        color="#ffffff" // Neutral color for fill light
        decay={2}
      />
      <pointLight
        ref={extraFillLight}
        position={[-5, -2, 5]} // Additional fill light for more balanced lighting
        intensity={1.0} // Adjusted intensity for extra fill light
        color="#ffffff" // Neutral color for extra fill light
        decay={2}
      />
      <hemisphereLight
        intensity={0.7} // Increased intensity for a brighter ambient effect
        color="#ffffff" // Neutral color for the hemisphere light
        groundColor="#333333" // Darker ground color for contrast
      />
    </>
  );
};