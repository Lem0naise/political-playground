'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { findMergeCandidates, mergeParties, type Party, type MergeCandidate } from '@/lib/partyMerger';

export default function PartyMerging() {
  const { state, actions } = useGame();
  const [parties, setParties] = useState<Party[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [currentMerge, setCurrentMerge] = useState<MergeCandidate | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Party | null>(null);

  useEffect(() => {
    if (state.pendingParties) {
      setParties(state.pendingParties);
      const candidates = findMergeCandidates(state.pendingParties);
      setMergeCandidates(candidates);
      if (candidates.length > 0) {
        setCurrentMerge(candidates[0]);
        setNewPartyName(`${candidates[0].party1.party}-${candidates[0].party2.party} Alliance`);
        setSelectedLeader(candidates[0].party1);
      }
    }
  }, [state.pendingParties]);

  const handleMerge = () => {
    if (!currentMerge || !selectedLeader || !newPartyName.trim()) return;

    const mergedParty = mergeParties(currentMerge.party1, currentMerge.party2, newPartyName.trim(), selectedLeader);
    
    const updatedParties = parties.filter(p => 
      p.party !== currentMerge.party1.party && p.party !== currentMerge.party2.party
    );
    updatedParties.push(mergedParty);
    
    setParties(updatedParties);
    
    const remainingCandidates = findMergeCandidates(updatedParties);
    setMergeCandidates(remainingCandidates);
    
    if (remainingCandidates.length > 0) {
      setCurrentMerge(remainingCandidates[0]);
      setNewPartyName(`${remainingCandidates[0].party1.party}-${remainingCandidates[0].party2.party} Alliance`);
      setSelectedLeader(remainingCandidates[0].party1);
    } else {
      setCurrentMerge(null);
    }
  };

  const handleSkipMerge = () => {
    const remainingCandidates = mergeCandidates.slice(1);
    setMergeCandidates(remainingCandidates);
    
    if (remainingCandidates.length > 0) {
      setCurrentMerge(remainingCandidates[0]);
      setNewPartyName(`${remainingCandidates[0].party1.party}-${remainingCandidates[0].party2.party} Alliance`);
      setSelectedLeader(remainingCandidates[0].party1);
    } else {
      setCurrentMerge(null);
    }
  };

  const handleFinish = () => {
    actions.setPartyList('Custom Coalition', parties);
    actions.setGamePhase('player-selection');
  };

  if (!currentMerge) {
    return (
      <div className="min-h-screen p-3 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="newspaper-header text-3xl sm:text-4xl font-black text-white mb-8">
            MERGER COMPLETE
          </h1>
          <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Final Opposition ({parties.length} parties)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parties.map((party, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-slate-100 border border-slate-300 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-slate-600"
                    style={{ backgroundColor: party.colour }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{party.party}</div>
                    <div className="text-sm text-slate-700">{party.name}</div>
                    <div className="text-xs text-slate-600">Support: {(party.party_pop * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            🚀 LAUNCH CAMPAIGN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="newspaper-header text-3xl sm:text-4xl font-black text-white mb-4">
            PARTY MERGER NEGOTIATIONS
          </h1>
          <div className="border-t-2 border-b-2 border-yellow-500 py-3 my-4">
            <p className="campaign-status text-lg text-yellow-200">
              MERGER {mergeCandidates.length > 1 ? `1 OF ${mergeCandidates.length}` : 'FINAL'} • SIMILARITY: {(currentMerge.similarityScore * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Party 1 */}
          <div className="vintage-border p-6" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-slate-800 pb-2">
              {currentMerge.party1.party}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-slate-600"
                  style={{ backgroundColor: currentMerge.party1.colour }}
                ></div>
                <div>
                  <div className="font-bold text-slate-900">{currentMerge.party1.name}</div>
                  <div className="text-sm text-slate-600">Support: {(currentMerge.party1.party_pop * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Prog/Cons: {currentMerge.party1.prog_cons}</div>
                <div>Nat/Glob: {currentMerge.party1.nat_glob}</div>
                <div>Env/Eco: {currentMerge.party1.env_eco}</div>
                <div>Soc/Cap: {currentMerge.party1.soc_cap}</div>
                <div>Pac/Mil: {currentMerge.party1.pac_mil}</div>
                <div>Auth/Ana: {currentMerge.party1.auth_ana}</div>
                <div>Rel/Sec: {currentMerge.party1.rel_sec}</div>
              </div>
            </div>
          </div>

          {/* Party 2 */}
          <div className="vintage-border p-6" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 border-b-2 border-slate-800 pb-2">
              {currentMerge.party2.party}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-slate-600"
                  style={{ backgroundColor: currentMerge.party2.colour }}
                ></div>
                <div>
                  <div className="font-bold text-slate-900">{currentMerge.party2.name}</div>
                  <div className="text-sm text-slate-600">Support: {(currentMerge.party2.party_pop * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Prog/Cons: {currentMerge.party2.prog_cons}</div>
                <div>Nat/Glob: {currentMerge.party2.nat_glob}</div>
                <div>Env/Eco: {currentMerge.party2.env_eco}</div>
                <div>Soc/Cap: {currentMerge.party2.soc_cap}</div>
                <div>Pac/Mil: {currentMerge.party2.pac_mil}</div>
                <div>Auth/Ana: {currentMerge.party2.auth_ana}</div>
                <div>Rel/Sec: {currentMerge.party2.rel_sec}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Merger Options */}
        <div className="vintage-border p-6 mb-8" style={{ background: 'var(--newspaper-bg)' }}>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Merger Details</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-black mb-2">New Party Name:</label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                className="w-full p-3 border-2 border-slate-400 rounded-lg font-mono"
                placeholder="Enter new party name..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Party Leader:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[currentMerge.party1, currentMerge.party2].map((party) => (
                  <div
                    key={party.party}
                    onClick={() => setSelectedLeader(party)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedLeader?.party === party.party
                        ? 'border-yellow-500 bg-yellow-100'
                        : 'border-slate-400 bg-slate-50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-slate-600"
                        style={{ backgroundColor: party.colour }}
                      ></div>
                      <div>
                        <div className="font-bold text-slate-900">{party.name}</div>
                        <div className="text-sm text-slate-600">from {party.party}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleSkipMerge}
            className="px-8 py-4 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200"
          >
            SKIP MERGER
          </button>
          
          <button
            onClick={handleMerge}
            disabled={!newPartyName.trim() || !selectedLeader}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            🤝 CONFIRM MERGER
          </button>
        </div>
      </div>
    </div>
  );
}
