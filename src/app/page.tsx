'use client';

import { useGame } from '@/contexts/GameContext';
import MainMenu from '@/components/MainMenu';
import PartySelection from '@/components/PartySelection';
import PartyMerging from '@/components/PartyMerging';
import PlayerSelection from '@/components/PlayerSelection';
import CampaignView from '@/components/CampaignView';
import ResultsView from '@/components/ResultsView';
import CoalitionFormation from '@/components/CoalitionFormation';

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
