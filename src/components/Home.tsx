import React from 'react';
import { useGame } from '../contexts/GameContext';
import MainMenu from './MainMenu';
import PartySelection from './PartySelection';
import PartyMerging from './PartyMerging';
import PlayerSelection from './PlayerSelection';
import CampaignView from './CampaignView';
import ResultsView from './ResultsView';
import CoalitionFormation from './CoalitionFormation';

export default function Home() {
  const { state } = useGame();

  const renderCurrentPhase = () => {
    switch (state.phase) {
      case 'setup':
        return <MainMenu />;
      case 'party-selection':
        return <PartySelection />;
      case 'partyMerging':
        return <PartyMerging />;
      case 'player-selection':
        return <PlayerSelection />;
      case 'campaign':
        return <CampaignView />;
      case 'coalition':
        return <CoalitionFormation />;
      case 'results':
        return <ResultsView />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <main className="min-h-screen">
      {renderCurrentPhase()}
    </main>
  );
}