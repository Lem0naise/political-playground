'use client';

import { useGame } from '@/contexts/GameContext';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';
import { useState, useRef } from 'react';

export default function PlayerSelection() {
  const { state, actions } = useGame();
  
  // Add ref for the creator form
  const creatorFormRef = useRef<HTMLDivElement>(null);

  const handlePlayerSelect = (candidateId: number) => {
    actions.setPlayerCandidate(candidateId);
    actions.startCampaign();
  };

  // --- Custom Party Creator State ---
  const [showCreator, setShowCreator] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState<number | null>(null);
  const [customParty, setCustomParty] = useState({
    party: '',
    name: '',
    colour: '#e11d48',
    party_pop: 7,
    prog_cons: 0,
    nat_glob: 0,
    env_eco: 0,
    soc_cap: 0,
    pac_mil: 0,
    auth_ana: 0,
    rel_sec: 0,
  });

  // Helper for value changes
  const handleCustomChange = (field: string, value: any) => {
    setCustomParty(prev => ({ ...prev, [field]: value }));
  };

  // Reset form to initial state
  const resetCustomPartyForm = () => {
    setCustomParty({
      party: '',
      name: '',
      colour: '#e11d48',
      party_pop: 7,
      prog_cons: 0,
      nat_glob: 0,
      env_eco: 0,
      soc_cap: 0,
      pac_mil: 0,
      auth_ana: 0,
      rel_sec: 0,
    });
    setEditingPartyId(null);
  };

  // Handle editing existing party with scroll
  const handleEditParty = (candidate: any) => {
    setCustomParty({
      party: candidate.party,
      name: candidate.name,
      colour: candidate.colour,
      party_pop: candidate.party_pop,
      prog_cons: candidate.vals[0],
      nat_glob: candidate.vals[1],
      env_eco: candidate.vals[2],
      soc_cap: candidate.vals[3],
      pac_mil: candidate.vals[4],
      auth_ana: candidate.vals[5],
      rel_sec: candidate.vals[6],
    });
    setEditingPartyId(candidate.id);
    setShowCreator(true);
    
    // Scroll to the form after a brief delay to ensure it's rendered
    setTimeout(() => {
      creatorFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  // Submit handler
  const handleCreateParty = () => {
    if (!customParty.party || !customParty.name) return;
    setCreating(true);
    
    if (editingPartyId !== null) {
      // Update existing party
      const updatedCandidates = state.candidates.map(c => {
        if (c.id === editingPartyId) {
          return {
            ...c,
            name: customParty.name,
            party: customParty.party,
            party_pop: customParty.party_pop,
            vals: [
              customParty.prog_cons,
              customParty.nat_glob,
              customParty.env_eco,
              customParty.soc_cap,
              customParty.pac_mil,
              customParty.auth_ana,
              customParty.rel_sec
            ],
            colour: customParty.colour,
          };
        }
        return c;
      });
      
      actions.setPartyList(
        "With Updated Party",
        updatedCandidates.map(c => ({
          id: c.id,
          name: c.name,
          party: c.party,
          party_pop: c.party_pop,
          prog_cons: c.vals[0],
          nat_glob: c.vals[1],
          env_eco: c.vals[2],
          soc_cap: c.vals[3],
          pac_mil: c.vals[4],
          auth_ana: c.vals[5],
          rel_sec: c.vals[6],
          colour: c.colour,
          swing: c.swing || 0
        }))
      );
    } else {
      // Create new party
      const newParty = {
        id: 999,
        name: customParty.name,
        party: customParty.party,
        party_pop: customParty.party_pop,
        prog_cons: customParty.prog_cons,
        nat_glob: customParty.nat_glob,
        env_eco: customParty.env_eco,
        soc_cap: customParty.soc_cap,
        pac_mil: customParty.pac_mil,
        auth_ana: customParty.auth_ana,
        rel_sec: customParty.rel_sec,
        colour: customParty.colour,
        swing: 0,
      };
      actions.setPartyList(
          "With Custom Party",
          [...state.candidates.map(c => ({
            id: c.id,
            name: c.name,
            party: c.party,
            party_pop: c.party_pop,
            prog_cons: c.vals[0],
            nat_glob: c.vals[1],
            env_eco: c.vals[2],
            soc_cap: c.vals[3],
            pac_mil: c.vals[4],
            auth_ana: c.vals[5],
            rel_sec: c.vals[6],
            colour: c.colour,
            swing: c.swing || 0
          })), newParty]
        );
    }

    console.log(state.candidates);
    resetCustomPartyForm(); // Reset the form after successful creation
    setShowCreator(false);
    setCreating(false);
  };

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="newspaper-header text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            CANDIDATE SELECTION
          </h1>
          <div className="border-t-2 border-b-2 border-red-500 py-2 sm:py-3 my-3 sm:my-4">
            <p className="campaign-status text-base sm:text-lg text-red-200">
              CHOOSE YOUR PARTY BANNER • {state.country}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Existing candidate options */}
          {state.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="vintage-border p-4 sm:p-6 transition-all duration-200 hover:border-yellow-400 hover:bg-yellow-900/10 transform hover:scale-105"
              style={{ background: 'var(--newspaper-bg)' }}
            >
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                <div 
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-slate-800 flex-shrink-0"
                  style={{ backgroundColor: candidate.colour }}
                ></div>
                <div className="flex-1 min-w-0">
                  <h3 className="newspaper-header text-lg sm:text-xl font-bold text-slate-900">{candidate.party}</h3> 
                  <p className="text-slate-700 font-medium text-sm">Led by {candidate.name}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditParty(candidate);
                  }}
                  className="font-mono px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors duration-200 flex-shrink-0"
                  title="Edit Party"
                >
                  Edit
                </button>
              </div>

              <div className="mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm text-slate-600 mb-2 font-mono">
                  SUPPORT LEVEL: {candidate.party_pop >= 1 ? `${candidate.party_pop.toFixed(1)}` : `${(candidate.party_pop * 100).toFixed(1)}`}
                </div>
                <div className="w-full bg-slate-300 rounded-full h-2 sm:h-3 border border-slate-400">
                  <div 
                    className="h-2 sm:h-3 rounded-full relative overflow-hidden"
                    style={{ 
                      backgroundColor: candidate.colour,
                      width: `${Math.max(5, Math.min(100, candidate.party_pop > 1 ? candidate.party_pop * 2 : candidate.party_pop * 200))}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <span className="font-semibold text-slate-700 text-xs">Ideology: </span>
                {getIdeologyProfile(candidate.vals)}
              </div>

              <button 
                onClick={() => handlePlayerSelect(candidate.id)}
                className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-sm sm:text-base"
              >
                🚀 CAMPAIGN AS {candidate.party.toUpperCase()}
              </button>
            </div>
          ))}

          {/* --- Create Your Own Party Card --- */}
          <div
            className="vintage-border p-4 sm:p-6 cursor-pointer transition-all duration-200 hover:border-yellow-400 hover:bg-yellow-900/10 transform hover:scale-105 flex flex-col justify-between"
            style={{ background: 'var(--newspaper-bg)' }}
            onClick={() => setShowCreator(true)}
          >
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 border-slate-800 flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: customParty.colour }}
              >
                <span className="text-white font-bold text-xl">+</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="newspaper-header text-lg sm:text-xl font-bold text-slate-900">Create Your Own</h3> 
                <p className="text-slate-700 font-medium text-sm">Custom party & leader</p>
              </div>
            </div>
            <button className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-sm sm:text-base">
              CREATE YOUR OWN PARTY
            </button>
          </div>
        </div>

        {/* --- Inline Party Creator --- */}
        {showCreator && (
          <div 
            ref={creatorFormRef}
            className="vintage-border p-4 sm:p-6 mb-6 sm:mb-8" 
            style={{ background: 'var(--newspaper-bg)' }}
          >
            <h3 className="newspaper-header text-xl font-black text-slate-900 mb-4 border-b-2 border-slate-800 pb-2">
              {editingPartyId !== null ? 'Edit Party' : 'Create Your Own Party'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Party Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-400 rounded"
                  value={customParty.party}
                  onChange={e => handleCustomChange('party', e.target.value)}
                  placeholder="e.g. People's Movement"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leader Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-400 rounded"
                  value={customParty.name}
                  onChange={e => handleCustomChange('name', e.target.value)}
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Party Colour</label>
                <input
                  type="color"
                  className="w-16 h-10 border border-slate-400 rounded"
                  value={customParty.colour}
                  onChange={e => handleCustomChange('colour', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Support Level (0-10)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.1}
                  className="w-full p-2 border border-slate-400 rounded"
                  value={customParty.party_pop}
                  onChange={e => handleCustomChange('party_pop', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Sliders for values */}
              {[
                { key: 'prog_cons', label: 'Progressive vs Conservative' },
                { key: 'nat_glob', label: 'Nationalist vs Globalist' },
                { key: 'env_eco', label: 'Environmentalist vs Pro-Economy' },
                { key: 'soc_cap', label: 'Socialist vs Capitalist' },
                { key: 'pac_mil', label: 'Pacifist vs Militarist' },
                { key: 'auth_ana', label: 'Authoritarian vs Anarchist' },
                { key: 'rel_sec', label: 'Religious vs Secular' },
              ].map(slider => (
                <div key={slider.key}>
                  <label className="block font-bold text-slate-700 mb-1">{slider.label}</label>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={customParty[slider.key as keyof typeof customParty]}
                    onChange={e => handleCustomChange(slider.key, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-slate-500 mt-1">Value: {customParty[slider.key as keyof typeof customParty]}</div>
                </div>
              ))}
            </div>
            
            {getIdeologyProfile([customParty.prog_cons, customParty.nat_glob, customParty.env_eco, customParty.soc_cap, customParty.pac_mil, customParty.auth_ana, customParty.rel_sec])}
            <div className="flex gap-3">
              <button
                onClick={handleCreateParty}
                disabled={!customParty.party || !customParty.name || creating}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-base"
              >
                {creating ? (editingPartyId !== null ? 'Saving...' : 'Creating...') : (editingPartyId !== null ? 'Save Changes' : 'Add This Party')}
              </button>
              <button
                onClick={() => {
                  resetCustomPartyForm(); // Reset form when canceling
                  setShowCreator(false);
                }}
                className="px-6 py-3 bg-slate-400 hover:bg-slate-500 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => actions.resetGame()}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status"
          >
            ◄ RETURN TO SETUP
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-slate-300 text-xs">
            Created by <a href="https://indigonolan.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline transition-colors">Indigo Nolan</a>
          </p>
        </div>
      </div>
    </div>
  );
}
