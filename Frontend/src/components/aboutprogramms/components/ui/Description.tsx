import { PROFILE } from '../../config/profile.ts';
import React from 'react';

export const Description = () => (
<div className="space-container">
  <div className="stars"></div>
  <div className="description-container">
    <p className="description-text">{PROFILE.description}</p>
    <a href={PROFILE.cvlink} className="custom-link">Sadeem Internship</a>
  </div>
</div>
);