import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float } from '@react-three/drei';

import { Logo3D } from './Logo3D';

export function Scene3D() {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} />
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Float
        speed={2}
        rotationIntensity={0.5}
        floatIntensity={0.5}
      >
        <Logo3D />
      </Float>
      <Environment preset="city" />
    </Canvas>
  );
}
