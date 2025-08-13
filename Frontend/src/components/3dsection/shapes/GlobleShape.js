// eslint-disable-next-line

import { Shape } from 'three';

export function createGlobeShape() {
  const shape = new Shape();
  
  // Create main circle
  shape.absarc(0, 0, 0.8, 0, Math.PI * 2, false);
  
  // Create horizontal line
  shape.moveTo(-0.8, 0);
  shape.lineTo(0.8, 0);
  
  // Create vertical arc lines
  const numArcs = 3;
  for (let i = 1; i <= numArcs; i++) {
    const x = (0.8 / (numArcs + 1)) * i;
    shape.moveTo(-x, -Math.sqrt(0.64 - x * x));
    shape.lineTo(-x, Math.sqrt(0.64 - x * x));
    shape.moveTo(x, -Math.sqrt(0.64 - x * x));
    shape.lineTo(x, Math.sqrt(0.64 - x * x));
  }
  
  return shape;
}