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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Select Party List
          </h1>
          <p className="text-lg text-green-200">
            Choose which set of political parties you want to compete against in {state.country}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(partyLists).map(([listName, parties]) => (
            <div
              key={listName}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all duration-200 ${
                selectedList === listName
                  ? 'ring-4 ring-green-400 transform scale-105'
                  : 'hover:shadow-xl hover:transform hover:scale-102'
              }`}
              onClick={() => setSelectedList(listName)}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">{listName}</h3>
              <p className="text-gray-600 mb-4">{parties.length} parties</p>
              
              <div className="space-y-2">
                {parties.slice(0, 4).map((party, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: party.colour || 'gray' }}
                    ></div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{party.party}</div>
                      <div className="text-xs text-gray-500">{party.name}</div>
                    </div>
                  </div>
                ))}
                {parties.length > 4 && (
                  <div className="text-xs text-gray-400 text-center pt-2">
                    +{parties.length - 4} more parties
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedList && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Party List: {selectedList}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partyLists[selectedList].map((party, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: party.colour || 'gray' }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{party.party}</div>
                    <div className="text-sm text-gray-600">{party.name}</div>
                    <div className="text-xs text-gray-500">
                      Support: {party.party_pop >= 1 ? `${party.party_pop.toFixed(1)}%` : `${(party.party_pop * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => actions.resetGame()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Country Selection
          </button>
          
          <button
            onClick={handlePartyListSelect}
            disabled={!selectedList}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors duration-200"
          >
            {selectedList ? `Continue with ${selectedList}` : 'Select a Party List'}
          </button>
        </div>
      </div>
    </div>
  );
}
