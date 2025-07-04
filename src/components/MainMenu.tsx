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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            Election Campaign Simulator
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            Lead your party to victory in a dynamic political landscape
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-6 text-gray-700">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Choose Your Country</h3>
              <p className="text-sm">Select a country to get voting demographics and population data</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Pick Your Parties</h3>
              <p className="text-sm">Choose a party list and select which party you want to lead</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Run Your Campaign</h3>
              <p className="text-sm">Face events, make strategic choices, and watch the polls change</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Your Country</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(countries).map(([countryCode, countryData]) => (
              <button
                key={countryCode}
                onClick={() => setSelectedCountry(countryCode)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedCountry === countryCode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-gray-800">{countryCode}</div>
                <div className="text-sm text-gray-600">
                  {countryData.pop?.toLocaleString()} voters
                </div>
                <div className="text-xs text-gray-500">
                  {countryData.hos}
                </div>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Country Details: {selectedCountry}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>Population: {countries[selectedCountry]?.pop?.toLocaleString()}</div>
                <div>Scale: {countries[selectedCountry]?.scale}</div>
                <div className="col-span-2">Head of State: {countries[selectedCountry]?.hos}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleCountrySelect}
            disabled={!selectedCountry}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200"
          >
            {selectedCountry ? `Continue with ${selectedCountry}` : 'Select a Country'}
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-blue-200 text-sm">
            Created by Indigo • Inspired by The Campaign Trail
          </p>
        </div>
      </div>
    </div>
  );
}
