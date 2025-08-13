// eslint-disable-next-line

import { Shape } from 'three';

export function createStarShape() {
  const shape = new Shape();
  const points = 8;
  const outerRadius = 2;
  const innerRadius = 1.6;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i;
    const x = Math.sin(angle) * radius;
    const y = Math.cos(angle) * radius;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  
  shape.closePath();
  return shape;
}