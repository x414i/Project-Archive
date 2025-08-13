import { Html } from '@react-three/drei';
import { SOCIAL_LINKS } from '../../config/social';
import React from 'react';

interface SocialLinkProps {
  link: typeof SOCIAL_LINKS[number];
  position: [number, number, number];
}

export const SocialLink = ({ link, position }: SocialLinkProps) => (
  <Html position={position} center>
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="social-icon"
      style={{ color: link.color }}
      aria-label={link.label}
    >
      <link.Icon size={24} />
    </a>
  </Html>
);