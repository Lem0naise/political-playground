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
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="newspaper-header text-7xl font-black text-white mb-4 tracking-tight">
            THE CAMPAIGN TRIBUNE
          </h1>
          <div className="border-t-4 border-b-4 border-red-500 py-4 my-6">
            <p className="campaign-status text-xl text-red-200 tracking-widest">
              INTERACTIVE ELECTION SIMULATOR
            </p>
          </div>
          <p className="news-body text-xl text-stone-300 mb-8 max-w-2xl mx-auto">
            Step into the shoes of a political strategist and navigate the complex world of campaign management
          </p>
        </div>

        <div className="vintage-border p-8 mb-8 relative overflow-hidden" style={{ background: 'var(--newspaper-bg)' }}>
          <div className="absolute top-0 left-0 bg-red-700 text-white px-4 py-2 text-sm font-bold">
            GUIDE
          </div>
          <h2 className="newspaper-header text-3xl font-black text-slate-900 mb-8 mt-4 border-b-2 border-slate-800 pb-2">
            CAMPAIGN PLAYBOOK
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-slate-800">
            <div className="text-center">
              <div className="campaign-board w-20 h-20 flex items-center justify-center mx-auto mb-4 rounded-lg">
                <span className="campaign-status text-2xl font-bold text-green-400">1</span>
              </div>
              <h3 className="campaign-status text-lg font-bold mb-3">SELECT TERRITORY</h3>
              <p className="news-body text-sm">Choose your electoral battleground with unique demographics and voting patterns</p>
            </div>
            <div className="text-center">
              <div className="campaign-board w-20 h-20 flex items-center justify-center mx-auto mb-4 rounded-lg">
                <span className="campaign-status text-2xl font-bold text-green-400">2</span>
              </div>
              <h3 className="campaign-status text-lg font-bold mb-3">CHOOSE PARTIES</h3>
              <p className="news-body text-sm">Select your opposition and pick which party banner you'll carry to victory</p>
            </div>
            <div className="text-center">
              <div className="campaign-board w-20 h-20 flex items-center justify-center mx-auto mb-4 rounded-lg">
                <span className="campaign-status text-2xl font-bold text-green-400">3</span>
              </div>
              <h3 className="campaign-status text-lg font-bold mb-3">CAMPAIGN TRAIL</h3>
              <p className="news-body text-sm">Navigate breaking news events and strategic decisions that shape voter sentiment</p>
            </div>
          </div>
        </div>

        <div className="campaign-board p-8 rounded-lg">
          <h2 className="campaign-status text-2xl font-bold text-yellow-400 mb-6 text-center">
            🗺️ ELECTORAL MAP SELECTION
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(countries).map(([countryCode, countryData]) => (
              <button
                key={countryCode}
                onClick={() => setSelectedCountry(countryCode)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCountry === countryCode
                    ? 'border-yellow-400 bg-yellow-900/30 text-yellow-400'
                    : 'border-slate-600 bg-slate-800/50 text-white hover:border-yellow-600 hover:bg-slate-700/50'
                }`}
              >
                <div className="campaign-status font-bold">{countryCode}</div>
                <div className="text-sm text-slate-300 font-mono">
                  {countryData.pop?.toLocaleString()} voters
                </div>
                <div className="text-xs text-slate-400">
                  {countryData.hos}
                </div>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="mb-6 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
              <h3 className="campaign-status font-bold text-yellow-400 mb-3">TERRITORY INTEL: {selectedCountry}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-300 font-mono">
                <div>POPULATION: {countries[selectedCountry]?.pop?.toLocaleString()}</div>
                <div>SCALE: {countries[selectedCountry]?.scale}</div>
                <div className="col-span-2">HEAD OF STATE: {countries[selectedCountry]?.hos}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleCountrySelect}
            disabled={!selectedCountry}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-6 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 campaign-status text-lg"
          >
            {selectedCountry ? `🚀 LAUNCH CAMPAIGN IN ${selectedCountry}` : 'SELECT YOUR BATTLEGROUND'}
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm font-mono">
            Tribune Interactive • Political Simulation Division
          </p>
        </div>
      </div>
    </div>
  );
}
