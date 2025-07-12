'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function MainMenu() {
  const { actions } = useGame();
  const [countries, setCountries] = useState<Record<string, any>>({});
  const [selectedCountry, setSelectedCountry] = useState('');

  useEffect(() => {
    fetch('/data/countries.json')
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error('Failed to load countries:', err));
  }, []);

  const handleCountrySelect = () => {
    if (selectedCountry && countries[selectedCountry]) {
      // Add some randomization to voting demographics like in the original
      const countryData = { ...countries[selectedCountry] };
      for (const key in countryData.vals) {
        countryData.vals[key] += Math.round(10 * (Math.random() - 0.5));
      }
      actions.setCountry(selectedCountry, countryData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="newspaper-header text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-4 tracking-tight">
            THE POLITICAL PLAYGROUND
          </h1>
          <div className="border-t-4 border-b-4 border-red-500 py-3 sm:py-4 my-4 sm:my-6">
            <p className="campaign-status text-base sm:text-xl text-red-200 tracking-widest">
              INTERACTIVE ELECTION SIMULATOR
            </p>
          </div>
        </div>

        <div className="vintage-border p-4 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden" style={{ background: 'var(--newspaper-bg)' }}>
          <div className="absolute top-0 left-0 bg-red-700 text-white px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-bold">
            GUIDE
          </div>
          <h2 className="newspaper-header text-2xl sm:text-3xl font-black text-slate-900 mb-6 sm:mb-8 mt-4 border-b-2 border-slate-800 pb-2">
            CAMPAIGN PLAYBOOK
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 text-slate-800">
            <div className="text-center">
              <div className="campaign-board w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4 rounded-lg">
                <span className="campaign-status text-xl sm:text-2xl font-bold text-green-400">1</span>
              </div>
              <h3 className="campaign-status text-base sm:text-lg font-bold mb-2 sm:mb-3">SELECT TERRITORY</h3>
              <p className="news-body text-xs sm:text-sm">Choose your electoral battleground with unique demographics and voting patterns</p>
            </div>
            <div className="text-center">
              <div className="campaign-board w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4 rounded-lg">
                <span className="campaign-status text-xl sm:text-2xl font-bold text-green-400">2</span>
              </div>
              <h3 className="campaign-status text-base sm:text-lg font-bold mb-2 sm:mb-3">CHOOSE PARTIES</h3>
              <p className="news-body text-xs sm:text-sm">Select your opposition and pick which party banner you'll carry to victory</p>
            </div>
            <div className="text-center">
              <div className="campaign-board w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4 rounded-lg">
                <span className="campaign-status text-xl sm:text-2xl font-bold text-green-400">3</span>
              </div>
              <h3 className="campaign-status text-base sm:text-lg font-bold mb-2 sm:mb-3">CAMPAIGN TRAIL</h3>
              <p className="news-body text-xs sm:text-sm">Navigate breaking news events and strategic decisions that shape voter sentiment</p>
            </div>
          </div>
        </div>

        <div className="campaign-board p-4 sm:p-6 lg:p-8 rounded-lg">
          <h2 className="campaign-status text-xl sm:text-2xl font-bold text-yellow-400 mb-4 sm:mb-6 text-center">
            LOCATION SELECTION
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {Object.entries(countries)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([countryCode, countryData]) => (
              <button
                key={countryCode}
                onClick={() => setSelectedCountry(countryCode)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 min-h-[80px] sm:min-h-[90px] ${
                  selectedCountry === countryCode
                    ? 'border-yellow-400 bg-yellow-900/30 text-yellow-400'
                    : 'border-slate-600 bg-slate-800/50 text-white hover:border-yellow-600 hover:bg-slate-700/50'
                }`}
              >
                <div className="campaign-status font-bold text-base sm:text-lg">{countryCode}</div>
                <div className="text-xs sm:text-sm text-slate-300 font-mono">
                  {(countryData.pop * countryData.scale).toLocaleString()} voters
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {countryData.hos}
                </div>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
              <h3 className="campaign-status font-bold text-yellow-400 mb-2 sm:mb-3 text-sm sm:text-base">TERRITORY INTEL: {selectedCountry}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300 font-mono">
                <div>POPULATION: {(countries[selectedCountry]?.pop*countries[selectedCountry]?.scale).toLocaleString()}</div>
                <div className="sm:col-span-2">HEAD OF STATE: {countries[selectedCountry]?.hos}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleCountrySelect}
            disabled={!selectedCountry}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 sm:py-6 px-4 sm:px-8 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-base sm:text-lg"
          >
            {selectedCountry ? `🚀 LAUNCH CAMPAIGN IN ${selectedCountry}` : 'SELECT YOUR BATTLEGROUND'}
          </button>
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-slate-400 text-xs sm:text-sm font-mono mb-2">
            Tribune Interactive • Political Simulation Division
          </p>
          
          <div className="max-w-4xl mx-auto bg-slate-800/30 border border-slate-600 rounded-lg p-4 sm:p-6 mb-4">
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 sm:p-4 mb-4">
              <p className="text-yellow-400 font-bold text-sm sm:text-base mb-2">
                ⚠️ IMPORTANT DISCLAIMER
              </p>
              <p className="text-yellow-200 text-xs sm:text-sm">
                This is a work of fiction for entertainment and educational purposes only.
              </p>
            </div>

            <div className="space-y-3 text-slate-300 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p><strong className="text-white">Fictional Simulation:</strong> This game is a simplified, fictional representation of political processes and does not accurately reflect real-world politics.</p>
                </div>
                <div>
                  <p><strong className="text-white">No Political Endorsement:</strong> The parties, candidates, and positions shown are fictional. No real political entities are being endorsed or criticized.</p>
                </div>
                <div>
                  <p><strong className="text-white">Educational Purpose:</strong> Designed to demonstrate basic concepts of campaigning and political strategy in an accessible format.</p>
                </div>
                <div>
                  <p><strong className="text-white">Not Political Advice:</strong> This game should not influence real voting decisions. Please research actual candidates and issues for real elections.</p>
                </div>
              </div>
              
              <div className="border border-blue-600 rounded-lg p-3 mt-4">
                <p className="text-blue-200 text-xs sm:text-sm">
                  <strong>Remember:</strong> Real democracy involves complex issues. I strongly encourage you to engage with real political processes through voting, volunteering, and staying informed.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-slate-500 text-xs">
            All content is simplified for gameplay and should not influence real voting decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
