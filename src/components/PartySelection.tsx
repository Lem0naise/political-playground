import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function PartySelection() {
  const { state, actions } = useGame();
  const [partyLists, setPartyLists] = useState<Record<string, any[]>>({});
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/data/parties.json')
      .then(res => res.json())
      .then(data => setPartyLists(data))
      .catch(err => console.error('Failed to load parties:', err));
  }, []);

  const handlePartyListToggle = (listName: string) => {
    setSelectedLists(prev =>
      prev.includes(listName)
        ? prev.filter(name => name !== listName)
        : [...prev, listName]
    );
  };

  const handleProceedToMerging = () => {
    if (selectedLists.length > 0) {
      const combinedParties = selectedLists.flatMap(listName => partyLists[listName]);
      actions.setPendingParties(combinedParties);
      actions.setGamePhase('partyMerging');
    }
  };

  const filteredPartyLists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const entries = Object.entries(partyLists).sort(([a], [b]) => a.localeCompare(b));

    if (!term) {
      return entries;
    }

    return entries.filter(([listName, parties]) => {
      const listMatch = listName.toLowerCase().includes(term);
      const partyMatch = parties?.some(party => {
        const label = `${party?.party ?? ''} ${party?.name ?? ''}`.toLowerCase();
        return label.includes(term);
      });
      return listMatch || partyMatch;
    });
  }, [partyLists, searchTerm]);

  const totalSelectedParties = useMemo(() => {
    return selectedLists.reduce((total, listName) => {
      const parties = partyLists[listName];
      return total + (parties ? parties.length : 0);
    }, 0);
  }, [partyLists, selectedLists]);

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
              PARTY HEADQUARTERS
            </h1>
            <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-[0.35em]">
              OPPOSITION SELECTION • {state.country || 'UNASSIGNED'}
            </p>
          </div>

          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  Assemble Your Opposition
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-sm">
                  Select any combination of party lists. The next step will allow you to create custom parties and merge. After that, you will select one of the parties to play as.
                </p>
              </div>

              <div className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 w-full sm:w-auto">
                <div className="campaign-status text-xs text-slate-300">
                  {selectedLists.length} list{selectedLists.length === 1 ? '' : 's'} selected
                </div>
                <div className="campaign-status text-sm text-yellow-400">
                  {totalSelectedParties} parties queued
                </div>
              </div>
            </div>

            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search by list or party name"
                className="w-full rounded-lg bg-slate-900/40 border border-slate-700 text-slate-200 placeholder:text-slate-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPartyLists.length === 0 && (
                <div className="col-span-full text-center text-slate-400 text-sm py-6 border border-dashed border-slate-700 rounded-lg">
                  No party lists match your search. Try another term.
                </div>
              )}

              {filteredPartyLists.map(([listName, parties]) => {
                const isSelected = selectedLists.includes(listName);

                return (
                  <button
                    key={listName}
                    onClick={() => handlePartyListToggle(listName)}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${isSelected
                        ? 'border-yellow-400 bg-yellow-900/30 text-yellow-100'
                        : 'border-slate-600 bg-slate-800/40 text-slate-100 hover:border-yellow-600 hover:bg-slate-700/40'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="newspaper-header text-xl font-bold leading-snug">{listName}</div>
                        <div className="text-xs text-slate-300 font-mono mt-0">{parties.length} parties</div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 items-start">
                      {parties.slice(0, 3).map((party, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span
                            className="inline-flex w-2.5 h-2.5 rounded-full border border-white/70"
                            style={{ backgroundColor: party?.colour || 'transparent' }}
                          ></span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{party?.party}</div>
                            <div className="text-[0.65rem] text-slate-400 truncate">{party?.name}</div>
                          </div>
                        </div>
                      ))}
                      {parties.length > 3 && (
                        <div className="text-[0.65rem] text-slate-400 text-right font-mono">
                          +{parties.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedLists.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3">
                <div className="campaign-status text-xs text-yellow-300 mb-2">Ready for merging</div>
                <div className="flex flex-wrap gap-2">
                  {selectedLists.map(listName => (
                    <span
                      key={listName}
                      className="px-2 py-1 text-xs rounded-full border border-yellow-500/40 bg-yellow-900/20 text-yellow-100"
                    >
                      {listName} • {partyLists[listName]?.length ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={() => actions.resetGame()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
              >
                ◄ Return to Map
              </button>

              <button
                onClick={handleProceedToMerging}
                disabled={selectedLists.length === 0}
                className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 campaign-status text-sm disabled:cursor-not-allowed"
              >
                {selectedLists.length > 0 ? '🔀 Proceed to Party Merging' : 'Select Party Lists'}
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Political Playground © 2025-2026</p>
            <p>Fictional simulator. No real-world endorsement or advice.</p>
            <p>Version 1.1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
