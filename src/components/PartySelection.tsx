'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function PartySelection() {
  const { state, actions } = useGame();
  const [partyLists, setPartyLists] = useState<Record<string, any[]>>({});
  const [selectedList, setSelectedList] = useState('');

  useEffect(() => {
    fetch('/data/parties.json')
      .then(res => res.json())
      .then(data => setPartyLists(data))
      .catch(err => console.error('Failed to load parties:', err));
  }, []);

  const handlePartyListSelect = () => {
    if (selectedList && partyLists[selectedList]) {
      actions.setPartyList(selectedList, partyLists[selectedList]);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="newspaper-header text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            PARTY HEADQUARTERS
          </h1>
          <div className="border-t-2 border-b-2 border-red-500 py-2 sm:py-3 my-3 sm:my-4">
            <p className="campaign-status text-base sm:text-lg text-red-200">
              OPPOSITION SELECTION • {state.country}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {Object.entries(partyLists).map(([listName, parties]) => (
            <div
              key={listName}
              className={`vintage-border p-4 sm:p-6 cursor-pointer transition-all duration-200 ${
                selectedList === listName
                  ? 'border-yellow-400 bg-yellow-900/20 transform scale-105'
                  : 'border-slate-600 bg-slate-800/50 hover:border-yellow-600 hover:bg-slate-700/50'
              }`}
              onClick={() => setSelectedList(listName)}
              style={{ background: selectedList === listName ? 'rgba(251, 191, 36, 0.1)' : 'rgba(30, 41, 59, 0.8)' }}
            >
              <h3 className="newspaper-header text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">{listName}</h3>
              <p className="text-slate-300 mb-3 sm:mb-4 font-mono text-sm">{parties.length} PARTIES</p>
              
              <div className="space-y-2">
                {parties.slice(0, 4).map((party, index) => (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white flex-shrink-0"
                      style={{ backgroundColor: party.colour || 'gray' }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm text-white truncate">{party.party}</div>
                      <div className="text-xs text-slate-400 truncate">{party.name}</div>
                    </div>
                  </div>
                ))}
                {parties.length > 4 && (
                  <div className="text-xs text-slate-400 text-center pt-2 font-mono">
                    +{parties.length - 4} MORE PARTIES
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedList && (
          <div className="vintage-border p-4 sm:p-6 mb-6 sm:mb-8" style={{ background: 'var(--newspaper-bg)' }}>
            <h3 className="newspaper-header text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4 border-b-2 border-slate-800 pb-2">
              PARTY ROSTER: {selectedList}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {partyLists[selectedList].map((party, index) => (
                <div key={index} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-slate-100 border border-slate-300 rounded-lg">
                  <div 
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: party.colour || 'gray' }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm sm:text-base text-slate-900 truncate">{party.party}</div>
                    <div className="text-xs sm:text-sm text-slate-700 truncate">{party.name}</div>
                    <div className="text-xs text-slate-600 font-mono">
                      SUPPORT: {party.party_pop >= 1 ? `${party.party_pop.toFixed(1)}%` : `${(party.party_pop * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
          <button
            onClick={() => actions.resetGame()}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors duration-200 campaign-status"
          >
            ◄ RETURN TO MAP
          </button>
          
          <button
            onClick={handlePartyListSelect}
            disabled={!selectedList}
            className="px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status"
          >
            {selectedList ? `🚀 DEPLOY WITH ${selectedList}` : 'SELECT OPPOSITION'}
          </button>
        </div>
      </div>
    </div>
  );
}
