// eslint-disable-next-line

import { Shape } from 'three';

export function createMonitorShape() {
  const shape = new Shape();
  
  // Monitor screen
  shape.moveTo(-0.4, 0.3);
  shape.lineTo(0.4, 0.3);
  shape.lineTo(0.4, -0.2);
  shape.lineTo(-0.4, -0.2);
  shape.lineTo(-0.4, 0.3);
  
  // Stand base
  shape.moveTo(-0.2, -0.2);
  shape.lineTo(0.2, -0.2);
  shape.lineTo(0.15, -0.3);
  shape.lineTo(-0.15, -0.3);
  shape.lineTo(-0.2, -0.2);
  
  return shape;
}