'use client';

import { useGame } from '@/contexts/GameContext';
import MainMenu from '@/components/MainMenu';
import PartySelection from '@/components/PartySelection';
import PlayerSelection from '@/components/PlayerSelection';
import CampaignView from '@/components/CampaignView';
import ResultsView from '@/components/ResultsView';

export default function Home() {
  const { state } = useGame();

  const renderCurrentPhase = () => {
    switch (state.phase) {
      case 'setup':
        return <MainMenu />;
      case 'party-selection':
        return <PartySelection />;
      case 'player-selection':
        return <PlayerSelection />;
      case 'campaign':
        return <CampaignView />;
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
