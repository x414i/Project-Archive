import React from 'react';
import { SpaceScene } from './components/three/SpaceScene.tsx';
import { Description } from './components/ui/Description.tsx';
import { LoadingScreen } from './components/ui/LoadingScreen.tsx';
import './styles/global.css';

function App() {
  return (
    <div className="app-container">
      <LoadingScreen />
      <div className="canvas-container">
        <SpaceScene />
      </div>
      <Description />
    </div>
  );
}

export default App;