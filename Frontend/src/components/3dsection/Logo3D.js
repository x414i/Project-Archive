
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createStarShape } from './shapes/StarShape.js';
import { createGlobeShape } from './shapes/GlobleShape.js';
import { createMonitorShape } from './shapes/MonitorShape.js';
import { MaterialSettings } from '../../utils/materialSettings.js';

export function Logo3D() {
  const logoRef = useRef(null);
  const starShape = createStarShape();
  const globeShape = createGlobeShape();
  const monitorShape = createMonitorShape();
  
  const extrudeSettings = {
    steps: 1,
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 4
  };

  const thinExtrudeSettings = {
    ...extrudeSettings,
    depth: 0.1,
    bevelThickness: 0.02,
    bevelSize: 0.02,
  };

  useFrame((state, delta) => {
    if (logoRef.current) {
      logoRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={logoRef}>
      <mesh position={[0, 0, -0.1]}>
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        <meshStandardMaterial {...MaterialSettings.primary} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <extrudeGeometry args={[starShape, thinExtrudeSettings]} scale={0.95} />
        <meshStandardMaterial {...MaterialSettings.secondary} />
      </mesh>

      <mesh position={[0, 0, 0.15]}>
        <extrudeGeometry args={[globeShape, thinExtrudeSettings]} />
        <meshStandardMaterial {...MaterialSettings.primary} />
      </mesh>

      <mesh position={[0, -0.3, 0.15]}>
        <extrudeGeometry args={[monitorShape, thinExtrudeSettings]} />
        <meshStandardMaterial {...MaterialSettings.primary} />
      </mesh>
    </group>
  );
}