import React from 'react';
import { GameProvider } from './contexts/GameContext';
import Home from './components/Home';
import './App.css';

function App() {
  return (
    <GameProvider>
      <Home />
    </GameProvider>
  );
}

export default App;
