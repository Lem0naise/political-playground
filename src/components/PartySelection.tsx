'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function PartySelection() {
  const { state, actions } = useGame();
  const [partyLists, setPartyLists] = useState<Record<string, any[]>>({});
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

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

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="newspaper-header text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">
            PARTY HEADQUARTERS
          </h1>
          <div className="border-t-2 border-b-2 border-red-500 py-1 sm:py-2 my-2 sm:my-3">
            <p className="campaign-status text-sm sm:text-base text-red-200">
              OPPOSITION SELECTION • {state.country} • {selectedLists.length} LISTS SELECTED
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {Object.entries(partyLists)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([listName, parties]) => (
            <div
              key={listName}
              className={`vintage-border p-3 sm:p-4 cursor-pointer transition-all duration-200 ${
                selectedLists.includes(listName)
                  ? 'border-yellow-400 bg-yellow-900/20 transform scale-105'
                  : 'border-slate-600 bg-slate-800/50 hover:border-yellow-600 hover:bg-slate-700/50'
              }`}
              onClick={() => handlePartyListToggle(listName)}
              style={{ background: selectedLists.includes(listName) ? 'rgba(251, 191, 36, 0.1)' : 'rgba(30, 41, 59, 0.8)' }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="newspaper-header text-lg sm:text-xl font-bold text-white">{listName}</h3>
                {selectedLists.includes(listName) && (
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-slate-300 mb-2 sm:mb-3 font-mono text-xs">{parties.length} PARTIES</p>
              
              <div className="space-y-1">
                {parties.slice(0, 3).map((party, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-white flex-shrink-0"
                      style={{ backgroundColor: party.colour || 'gray' }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-white truncate">{party.party}</div>
                      <div className="text-xs text-slate-400 truncate">{party.name}</div>
                    </div>
                  </div>
                ))}
                {parties.length > 3 && (
                  <div className="text-xs text-slate-400 text-center pt-1 font-mono">
                    +{parties.length - 3} MORE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedLists.length > 0 && (
          <div className="vintage-border p-3 sm:p-4 mb-4 sm:mb-6" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="newspaper-header text-lg sm:text-xl font-black text-slate-900 mb-2 sm:mb-3 border-b-2 border-slate-800 pb-1">
              SELECTED OPPOSITION ({selectedLists.reduce((total, listName) => total + partyLists[listName].length, 0)} PARTIES)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {selectedLists.map(listName => (
                <div key={listName} className="p-2 bg-slate-200 border border-slate-400 rounded">
                  <div className="font-bold text-xs text-slate-900">{listName}</div>
                  <div className="text-xs text-slate-600">{partyLists[listName].length} parties</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <button
            onClick={() => actions.resetGame()}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status text-sm"
          >
            ◄ RETURN TO MAP
          </button>
          
          <button
            onClick={handleProceedToMerging}
            disabled={selectedLists.length === 0}
            className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-sm"
          >
            {selectedLists.length > 0 ? `🔀 PROCEED TO PARTY MERGING` : 'SELECT PARTY LISTS'}
          </button>
        </div>
      </div>
    </div>
  );
}
