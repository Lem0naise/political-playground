'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { findMergeCandidates, mergeParties, type Party, type MergeCandidate } from '@/lib/partyMerger';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';


// Helper to generate better party name suggestions
function generatePartyNameSuggestions(p1: Party, p2: Party): string[] {
  const names = [
    // Retain either party's name
    p1.party,
    p2.party,
    // Acronym of both names
    [p1.party, p2.party].map(n => n.split(/\s+/).map(w => w[0]).join('')).join('-'),
    // Blend: first word of p1 + last word of p2
    `${p1.party.split(' ')[0]} ${p2.party.split(' ').slice(-1)[0]}`,
    // "Alliance" or "Coalition" suffix
    `${p1.party}-${p2.party} Bloc`,
    `${p1.party} & ${p2.party} Coalition`,
    // Shortest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a,b)=>a.length-b.length)[0];
      const p2w = p2.party.split(' ').sort((a,b)=>a.length-b.length)[0];
      return `${p1w} ${p2w} Alliance`;
    })(),
    // Longest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a,b)=>b.length-a.length)[0];
      const p2w = p2.party.split(' ').sort((a,b)=>b.length-a.length)[0];
      return `${p1w} ${p2w} Party`;
    })(),
    // Shortest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a,b)=>a.length-b.length)[0];
      const p2w = p2.party.split(' ').sort((a,b)=>a.length-b.length)[0];
      return `${p2w} ${p1w} Alliance`;
    })(),
    // Longest unique word from each
    (() => {
      const p1w = p1.party.split(' ').sort((a,b)=>b.length-a.length)[0];
      const p2w = p2.party.split(' ').sort((a,b)=>b.length-a.length)[0];
      return `${p2w} ${p1w} Party`;
    })(),
  ];
  // Remove duplicates and empty
  return Array.from(new Set(names.filter(Boolean)));
}

export default function PartyMerging() {
  const { state, actions } = useGame();
  const [parties, setParties] = useState<Party[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<MergeCandidate[]>([]);
  const [currentMerge, setCurrentMerge] = useState<MergeCandidate | null>(null);
  const [newPartyName, setNewPartyName] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<Party | null>(null);

  // Memoize suggestions for current merge
  const nameSuggestions = useMemo(() => {
    if (!currentMerge) return [];
    return generatePartyNameSuggestions(currentMerge.party1, currentMerge.party2);
  }, [currentMerge]);

  useEffect(() => {
    if (state.pendingParties) {
      setParties(state.pendingParties);
      const candidates = findMergeCandidates(state.pendingParties);
      setMergeCandidates(candidates);
      if (candidates.length > 0) {
        setCurrentMerge(candidates[0]);
        // Use first suggestion as default
        const suggestions = generatePartyNameSuggestions(candidates[0].party1, candidates[0].party2);
        setNewPartyName(suggestions[0] || `${candidates[0].party1.party}-${candidates[0].party2.party} Alliance`);
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
      <div className="min-h-screen p-2 sm:p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="newspaper-header text-2xl sm:text-3xl font-black text-white mb-4">
            MERGER COMPLETE
          </h1>
          <div className="vintage-border p-3 sm:p-4 mb-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">Final Opposition ({parties.length} parties)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parties.map((party, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-slate-100 border border-slate-300 rounded">
                  <div 
                    className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: party.colour }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{party.party}</div>
                    <div className="text-xs text-slate-700 truncate">{party.name}</div>
                    <div className="text-xs text-slate-600">{(party.party_pop * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            🚀 LAUNCH CAMPAIGN
          </button>
          <p className="text-slate-300 text-xs mt-4">
            Created by <a href="https://indigonolan.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline transition-colors">Indigo Nolan</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="newspaper-header text-2xl sm:text-3xl font-black text-white mb-2">
            {state.country} PARTY MERGING
          </h1>
          <div className="border-t-2 border-b-2 border-yellow-500 py-1 sm:py-2 my-2">
            <p className="campaign-status text-sm sm:text-base text-yellow-200">
              MERGER {mergeCandidates.length > 1 ? `1 OF ${mergeCandidates.length}` : 'FINAL'} • SIMILARITY: {(currentMerge.similarityScore * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 font-mono">
          {/* Party 1 */}
          <div className="vintage-border p-3 sm:p-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 border-b border-slate-800 pb-1">
              {currentMerge.party1.party}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: currentMerge.party1.colour }}
                ></div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{currentMerge.party1.name}</div>
                </div>
              </div>
              <div className="text-xs mt-1">
                {getIdeologyProfile([
                  currentMerge.party1.prog_cons,
                  currentMerge.party1.nat_glob,
                  currentMerge.party1.env_eco,
                  currentMerge.party1.soc_cap,
                  currentMerge.party1.pac_mil,
                  currentMerge.party1.auth_ana,
                  currentMerge.party1.rel_sec
                ])}
              </div>
              {false && (<div className="grid grid-cols-2 gap-1 text-xs">
                <div>P/C: {currentMerge?.party1.prog_cons}</div>
                <div>N/G: {currentMerge?.party1.nat_glob}</div>
                <div>E/E: {currentMerge?.party1.env_eco}</div>
                <div>S/C: {currentMerge?.party1.soc_cap}</div>
                <div>P/M: {currentMerge?.party1.pac_mil}</div>
                <div>A/A: {currentMerge?.party1.auth_ana}</div>
                <div>R/S: {currentMerge?.party1.rel_sec}</div>
              </div>)}
            </div>
          </div>

          {/* Party 2 */}
          <div className="vintage-border p-3 sm:p-4" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 border-b border-slate-800 pb-1">
              {currentMerge.party2.party}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0"
                  style={{ backgroundColor: currentMerge.party2.colour }}
                ></div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{currentMerge.party2.name}</div>
                </div>
              </div>
              <div className="text-xs mt-1">
                {getIdeologyProfile([
                  currentMerge.party2.prog_cons,
                  currentMerge.party2.nat_glob,
                  currentMerge.party2.env_eco,
                  currentMerge.party2.soc_cap,
                  currentMerge.party2.pac_mil,
                  currentMerge.party2.auth_ana,
                  currentMerge.party2.rel_sec
                ])}
              </div>
              {false && (<div className="grid grid-cols-2 gap-1 text-xs">
                <div>P/C: {currentMerge?.party2.prog_cons}</div>
                <div>N/G: {currentMerge?.party2.nat_glob}</div>
                <div>E/E: {currentMerge?.party2.env_eco}</div>
                <div>S/C: {currentMerge?.party2.soc_cap}</div>
                <div>P/M: {currentMerge?.party2.pac_mil}</div>
                <div>A/A: {currentMerge?.party2.auth_ana}</div>
                <div>R/S: {currentMerge?.party2.rel_sec}</div>
              </div>)}
            </div>
          </div>
        </div>

        {/* Merger Options */}
        <div className="vintage-border p-3 sm:p-4 mb-4 sm:mb-6" style={{ background: 'var(--newspaper-bg)' }}>
          <div className="space-y-4">
            <div>
              <label className="block text-md font-bold text-black mb-1 font-mono">New Party Name:</label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                className="w-full p-2 border border-slate-400 rounded font-mono text-sm mb-2"
                placeholder="Enter new party name..."
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {nameSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`px-2 py-1 rounded border text-xs font-mono transition-colors ${
                      newPartyName === suggestion
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                    }`}
                    onClick={() => setNewPartyName(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Tip: You can keep either party's name, or pick a suggested blend/acronym.
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Party Leader:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[currentMerge.party1, currentMerge.party2].map((party) => (
                  <div
                    key={party.party}
                    onClick={() => setSelectedLeader(party)}
                    className={`p-2 border rounded cursor-pointer transition-all ${
                      selectedLeader?.party === party.party
                        ? 'border-yellow-500 bg-yellow-100'
                        : 'border-slate-400 bg-slate-50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0"
                        style={{ backgroundColor: party.colour }}
                      ></div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">{party.name}</div>
                        <div className="text-xs text-slate-600 truncate">from {party.party}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={handleSkipMerge}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 text-sm"
          >
            DON'T MERGE THESE PARTIES
          </button>
          
          <button
            onClick={handleMerge}
            disabled={!newPartyName.trim() || !selectedLeader}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
