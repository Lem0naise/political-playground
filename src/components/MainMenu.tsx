import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function MainMenu() {
  const { actions } = useGame();
  const [countries, setCountries] = useState<Record<string, any>>({});
  const [selectedCountry, setSelectedCountry] = useState('');
  const [totalPolls, setTotalPolls] = useState(52);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/data/countries.json')
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error('Failed to load countries:', err));
  }, []);

  const selectedData = useMemo(() => selectedCountry ? countries[selectedCountry] : null, [countries, selectedCountry]);
  const selectedPopulation = useMemo(() => {
    if (!selectedData?.pop || !selectedData?.scale) {
      return '—';
    }
    return (selectedData.pop * selectedData.scale).toLocaleString();
  }, [selectedData]);
  const selectedHos = selectedData?.hos ?? '—';

  const handleCountrySelect = () => {
    if (selectedCountry && countries[selectedCountry]) {
      // Add some randomization to voting demographics like in the original
      const countryData = { ...countries[selectedCountry] };
      for (const key in countryData.vals) {
        countryData.vals[key] += Math.round(10 * (Math.random() - 0.5));
      }
      actions.setCountry(selectedCountry, { ...countryData, totalPolls });
    }
  };

  const filteredCountries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const countryEntries = Object.entries(countries).sort(([a], [b]) => a.localeCompare(b));

    if (!term) {
      return countryEntries;
    }

    return countryEntries.filter(([code, data]) => {
      const displayName = `${code} ${data?.hos ?? ''}`.toLowerCase();
      return displayName.includes(term);
    });
  }, [countries, searchTerm]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div className="w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4">
              <a
                href="https://indigo.spot"
                target="_blank"
                rel="noopener noreferrer"
                className="campaign-status text-xs sm:text-sm text-yellow-300 bg-slate-900/40 border border-yellow-500/40 rounded-full px-3 py-1 hover:text-yellow-200 transition-colors"
              >
                Built by Indigo
              </a>
              <a
                href="https://indigo.spot/politicalplayground"
                target="_blank"
                rel="noopener noreferrer"
                className="campaign-status text-xs sm:text-sm text-yellow-300 bg-slate-900/40 border border-yellow-500/40 rounded-full px-3 py-1 hover:text-yellow-200 transition-colors"
              >
                What is this?
              </a>
            </div>
            <h1 className="newspaper-header text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
              THE POLITICAL PLAYGROUND
            </h1>
            <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-[0.35em]">
              INTERACTIVE ELECTION SIMULATOR
            </p>
          </div>

          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="campaign-status text-lg sm:text-xl text-yellow-400">
                  Choose Your Location
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-sm">
                  Currently, the country only changes the political demographics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">

                <div className="w-full sm:w-auto bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="campaign-status text-xs text-slate-300">
                      Campaign Length
                    </span>
                    <span className="campaign-status text-sm text-yellow-400">
                      {totalPolls} wks
                    </span>
                  </div>
                  <input
                    id="weeks-slider"
                    type="range"
                    min={4}
                    max={104}
                    step={1}
                    value={totalPolls}
                    onChange={e => setTotalPolls(Number(e.target.value))}
                    className="mt-2 w-full accent-yellow-400"
                  />

                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCountrySelect}
                    disabled={!selectedCountry}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 sm:py-4 px-4 rounded-lg transition-all duration-200 campaign-status text-sm sm:text-base disabled:cursor-not-allowed"
                  >
                    {selectedCountry ? `Launch Campaign in ${selectedCountry}` : 'Select a location to launch'}
                  </button>

                  <label className="sm:w-1/3 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 sm:py-4 px-4 rounded-lg transition-all duration-200 campaign-status text-sm sm:text-base cursor-pointer">
                    Load Save
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const state = JSON.parse(ev.target?.result as string);
                              actions.loadState(state);
                            } catch (e) {
                              alert('Invalid save file');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>


            </div>

            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search by code or leader"
                className="w-full rounded-lg bg-slate-900/40 border border-slate-700 text-slate-200 placeholder:text-slate-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {filteredCountries.length === 0 && (
                <div className="col-span-full text-center text-slate-400 text-sm py-6 border border-dashed border-slate-700 rounded-lg">
                  No matching locations. Try another search.
                </div>
              )}

              {filteredCountries.map(([countryCode, countryData]) => {
                const voters = countryData?.pop && countryData?.scale
                  ? (countryData.pop * countryData.scale).toLocaleString()
                  : '—';

                return (
                  <button
                    key={countryCode}
                    onClick={() => setSelectedCountry(countryCode)}
                    className={`text-left p-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${selectedCountry === countryCode
                      ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200'
                      : 'border-slate-600 bg-slate-800/40 text-slate-100 hover:border-yellow-600 hover:bg-slate-700/40'
                      }`}
                  >
                    <div className="campaign-status text-sm font-semibold">{countryCode}</div>
                    <div className="text-xs text-slate-300 font-mono">{voters} voters</div>
                    <div className="text-xs text-slate-400 truncate">{countryData?.hos ?? '—'}</div>
                    <div className="text-xs text-green-400 truncate">{countryData?.blocs ? 'Has Advanced Bloc-Based Voters' : ''}</div>
                  </button>
                );
              })}
            </div>

            {selectedCountry && (
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-200 font-mono">
                  <span className="campaign-status text-yellow-400 text-xs">
                    Selected: {selectedCountry}
                  </span>
                  <span>Population {selectedPopulation}</span>
                  <span>Head of State {selectedHos}</span>
                </div>
              </div>
            )}


          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            <p>Political Playground © 2025-2026</p>
            <p>Fictional simulator. No real-world endorsement or advice.</p>
            <p>Version 2.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
