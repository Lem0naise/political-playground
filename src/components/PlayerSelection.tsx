import { useGame } from '@/contexts/GameContext';
import { getIdeologyProfile } from '@/lib/ideologyProfiler';
import { useState, useRef, useMemo } from 'react';

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

  const availableCandidates = useMemo(() => state.candidates.length, [state.candidates]);
  const activeCountry = state.country || 'UNASSIGNED';
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <a
                href="https://indigo.spot"
                target="_blank"
                rel="noopener noreferrer"
                className="campaign-status text-xs sm:text-sm text-yellow-300 bg-slate-900/40 border border-yellow-500/40 rounded-full px-3 py-1 hover:text-yellow-200 transition-colors"
              >
                Built by Indigo
              </a>
            </div>
            <h1 className="newspaper-header text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              CANDIDATE SELECTION
            </h1>
            <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-[0.35em]">
              CHOOSE YOUR PARTY BANNER • {activeCountry}
            </p>
          </div>

          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  Pick Your Party
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-lg">
                  Select a leader to launch your campaign or create a custom party.
                </p>
              </div>

              <div className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 w-full sm:w-auto">
                <div className="campaign-status text-xs text-slate-300">
                  {availableCandidates} candidate{availableCandidates === 1 ? '' : 's'} available
                </div>
                <div className="campaign-status text-sm text-yellow-400">
                  {showCreator ? 'Custom party editor open' : 'Create or select to continue'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.candidates.map(candidate => (
                <div
                  key={candidate.id}
                  className="bg-slate-900/40 border border-slate-700 rounded-lg p-4 sm:p-5 text-left flex flex-col gap-4"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-600 flex-shrink-0"
                      style={{ backgroundColor: candidate.colour }}
                    ></div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="newspaper-header text-lg font-bold leading-tight text-slate-100 truncate">
                        {candidate.party}
                      </div>
                      <div className="text-xs text-slate-300 truncate">Led by {candidate.name}</div>
                    </div>
                    <button
                      onClick={() => handleEditParty(candidate)}
                      className="campaign-status text-[0.65rem] px-2 py-1 border border-blue-400/60 text-blue-200 rounded hover:border-yellow-400 hover:text-yellow-200 transition-colors"
                      title="Edit party"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-mono">
                      Support: {candidate.party_pop >= 1 ? candidate.party_pop.toFixed(1) : `${(candidate.party_pop * 100).toFixed(1)}%`}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: candidate.colour,
                          width: `${Math.max(5, Math.min(100, candidate.party_pop > 1 ? candidate.party_pop * 2 : candidate.party_pop * 200))}%`
                        }}
                      ></div>
                    </div>
                    <div className="text-[0.65rem] text-slate-400">
                      {getIdeologyProfile(candidate.vals)}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlayerSelect(candidate.id)}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 campaign-status text-sm"
                  >
                    🚀 Campaign as {candidate.party.toUpperCase()}
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowCreator(true)}
                className="bg-slate-900/40 border border-dashed border-yellow-500/40 text-left p-4 sm:p-5 rounded-lg flex flex-col justify-between gap-4 text-slate-100 hover:border-yellow-400 hover:bg-slate-800/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-yellow-500/60 flex items-center justify-center"
                    style={{ backgroundColor: customParty.colour }}
                  >
                    <span className="text-white text-xl font-bold">+</span>
                  </div>
                  <div className="space-y-1">
                    <div className="newspaper-header text-lg font-bold leading-tight text-yellow-200">
                      Create Your Own
                    </div>
                    <div className="text-xs text-slate-300">
                      Craft a new leader and party identity.
                    </div>
                  </div>
                </div>
                <div className="campaign-status text-xs text-yellow-300">Open custom party editor</div>
              </button>
            </div>

            {showCreator && (
              <div
                ref={creatorFormRef}
                className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 sm:px-6 py-5 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="newspaper-header text-xl font-black text-slate-100">
                    {editingPartyId !== null ? 'Edit Custom Party' : 'Create Your Own Party'}
                  </h3>
                  <button
                    onClick={() => {
                      resetCustomPartyForm();
                      setShowCreator(false);
                    }}
                    className="campaign-status text-xs text-slate-300 hover:text-yellow-200"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span className="campaign-status text-xs text-yellow-300">Party Name</span>
                    <input
                      type="text"
                      className="rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      value={customParty.party}
                      onChange={e => handleCustomChange('party', e.target.value)}
                      placeholder="e.g. People's Movement"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span className="campaign-status text-xs text-yellow-300">Leader Name</span>
                    <input
                      type="text"
                      className="rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      value={customParty.name}
                      onChange={e => handleCustomChange('name', e.target.value)}
                      placeholder="e.g. Jane Doe"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span className="campaign-status text-xs text-yellow-300">Party Colour</span>
                    <input
                      type="color"
                      className="w-16 h-10 rounded border border-slate-600"
                      value={customParty.colour}
                      onChange={e => handleCustomChange('colour', e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span className="campaign-status text-xs text-yellow-300">Support Level (0-10)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.1}
                      className="rounded-lg border border-slate-600 bg-slate-900/40 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      value={customParty.party_pop}
                      onChange={e => handleCustomChange('party_pop', Number(e.target.value))}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'prog_cons', label: 'Progressive ↔ Conservative' },
                    { key: 'nat_glob', label: 'Nationalist ↔ Globalist' },
                    { key: 'env_eco', label: 'Environmentalist ↔ Pro-Economy' },
                    { key: 'soc_cap', label: 'Socialist ↔ Capitalist' },
                    { key: 'pac_mil', label: 'Pacifist ↔ Militarist' },
                    { key: 'auth_ana', label: 'Authoritarian ↔ Anarchist' },
                    { key: 'rel_sec', label: 'Religious ↔ Secular' },
                  ].map(slider => (
                    <label key={slider.key} className="flex flex-col gap-2 text-xs text-slate-300">
                      <span className="campaign-status text-xs text-yellow-300">{slider.label}</span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={customParty[slider.key as keyof typeof customParty]}
                        onChange={e => handleCustomChange(slider.key, Number(e.target.value))}
                        className="w-full accent-yellow-400"
                      />
                      <span className="text-[0.65rem] text-slate-500">Value: {customParty[slider.key as keyof typeof customParty]}</span>
                    </label>
                  ))}
                </div>

                <div className="text-[0.65rem] text-slate-400">
                  {getIdeologyProfile([
                    customParty.prog_cons,
                    customParty.nat_glob,
                    customParty.env_eco,
                    customParty.soc_cap,
                    customParty.pac_mil,
                    customParty.auth_ana,
                    customParty.rel_sec
                  ])}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCreateParty}
                    disabled={!customParty.party || !customParty.name || creating}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-sm disabled:cursor-not-allowed"
                  >
                    {creating ? (editingPartyId !== null ? 'Saving…' : 'Creating…') : (editingPartyId !== null ? 'Save Changes' : 'Add This Party')}
                  </button>
                  <button
                    onClick={() => {
                      resetCustomPartyForm();
                      setShowCreator(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => actions.resetGame()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
              >
                ◄ Return to Setup
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Political Playground © {currentYear}</p>
            <p>Fictional simulator. No real-world endorsement or advice.</p>
            <p>Version 0.7.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
