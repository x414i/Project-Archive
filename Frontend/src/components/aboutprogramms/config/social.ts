import { Facebook, Github, Linkedin, MessageCircle, Twitter } from 'lucide-react';

export const SOCIAL_LINKS = [
  { 
    Icon: Github, 
    url: 'https://github.com/ahmedali12311', 
    color: '#333', 
    label: 'GitHub',
    orbitRadius: 4,
    orbitSpeed: 0.5
  },
  { 
    Icon: Facebook, 
    url: 'https://facebook.com/ogjughead', 
    color: '#1877f2', 
    label: 'Facebook',
    orbitRadius: 4.5,
    orbitSpeed: 0.4
  },
  { 
    Icon: MessageCircle, 
    url: 'https://t.me/SaturnRings1', 
    color: '#0088cc', 
    label: 'Telegram',
    orbitRadius: 5,
    orbitSpeed: 0.3
  },
  { 
    Icon: Linkedin, 
    url: 'https://linkedin.com/in/أحمد-علي-5076a3171/', 
    color: '#0077b5', 
    label: 'LinkedIn',
    orbitRadius: 5.5,
    orbitSpeed: 0.35
  },
  { 
    Icon: Twitter, 
    url: 'https://x.com/oG_Jughead', 
    color: '#1da1f2', 
    label: 'Twitter',
    orbitRadius: 6,
    orbitSpeed: 0.45
  }
] as const;