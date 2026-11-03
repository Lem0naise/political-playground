import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { importSaveGame } from '@/lib/saveManager';
import { VERSION } from '@/lib/version';
import { analyticsBlockedByDnt, analyticsOptedOut, isAnalyticsConfigured, setAnalyticsOptedOut, track } from '@/lib/analytics';

export default function MainMenu() {
  const { actions } = useGame();
  const [countries, setCountries] = useState<Record<string, any>>({});
  const [selectedCountry, setSelectedCountry] = useState('');
  const [totalPolls, setTotalPolls] = useState(52);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analyticsOff, setAnalyticsOff] = useState(() => analyticsOptedOut());
  const analyticsBlocked = analyticsBlockedByDnt();
  const analyticsConfigured = isAnalyticsConfigured();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCountries = useCallback(() => {
    setLoading(true);
    setCountriesError(null);
    fetch('/data/countries.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCountries(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load countries:', err);
        setCountriesError('Could not load the country list. Check your connection and try again.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

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
      // Add some randomization to voting demographics like in the original.
      // Clone `vals` too: it is nested inside the fetched object.
      const countryData = {
        ...countries[selectedCountry],
        vals: { ...countries[selectedCountry].vals }
      };
      for (const key in countryData.vals) {
        countryData.vals[key] += Math.round(10 * (Math.random() - 0.5));
      }
      actions.setCountry(selectedCountry, { ...countryData, totalPolls });
      track('campaign_launch', {
        country: selectedCountry,
        partyList: selectedCountry,
        totalPolls
      });
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
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-3">
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

          <div className="campaign-board p-5 sm:p-6 lg:p-8 rounded-xl space-y-5">
            <div className="text-center space-y-2">
              <h2 className="newspaper-header text-2xl sm:text-3xl font-black text-yellow-400 tracking-tight">
                CHOOSE YOUR LOCATION
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
                Select a country, set the campaign length, and launch your campaign — or load a previous save to continue where you left off.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 sm:flex-[2] bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="weeks-slider" className="campaign-status text-xs text-slate-300">Campaign Length</label>
                  <span className="campaign-status text-sm text-yellow-400">{totalPolls} wks</span>
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
              <button
                onClick={handleCountrySelect}
                disabled={!selectedCountry}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 campaign-status text-sm sm:text-base disabled:cursor-not-allowed"
              >
                {selectedCountry ? `Launch Campaign in ${selectedCountry}` : 'Select a location to launch'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const result = ev.target?.result as string;
                    if (!result) return;
                    const loadedState = importSaveGame(result);
                    if (loadedState) {
                      setLoadError(null);
                      actions.loadState(loadedState);
                    } else {
                      setLoadError('That file is not a valid Political Playground save.');
                    }
                  };
                  reader.onerror = () => setLoadError('Could not read that file.');
                  reader.readAsText(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 campaign-status text-sm sm:text-base"
              >
                Load Save
              </button>
            </div>
            {loadError && (
              <p role="alert" className="text-xs text-red-300 border border-red-500/40 bg-red-900/20 rounded-lg px-3 py-2">
                {loadError}
              </p>
            )}

            <div className="relative">
              <input
                type="search"
                aria-label="Search countries by name or leader"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search countries or leaders"
                className="w-full rounded-lg bg-slate-900/40 border border-slate-700 text-slate-200 placeholder:text-slate-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {loading && (
                <div className="col-span-full text-center text-slate-400 text-sm py-6 border border-dashed border-slate-700 rounded-lg">
                  Loading locations…
                </div>
              )}
              {countriesError && (
                <div role="alert" className="col-span-full text-center text-red-300 text-sm py-6 border border-red-500/40 rounded-lg space-y-2">
                  <p>{countriesError}</p>
                  <button
                    type="button"
                    onClick={loadCountries}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-700 hover:bg-slate-600 rounded-lg"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loading && !countriesError && filteredCountries.length === 0 && (
                <div className="col-span-full text-center text-slate-400 text-sm py-6 border border-dashed border-slate-700 rounded-lg">
                  No matching locations. Try another search.
                </div>
              )}

              {!loading && !countriesError && filteredCountries.map(([countryCode, countryData]) => {
                const voters = countryData?.pop && countryData?.scale
                  ? (countryData.pop * countryData.scale).toLocaleString()
                  : '—';

                return (
                  <button
                    key={countryCode}
                    onClick={() => setSelectedCountry(countryCode)}
                    aria-pressed={selectedCountry === countryCode}
                    className={`text-left p-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${selectedCountry === countryCode
                      ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200'
                      : 'border-slate-600 bg-slate-800/40 text-slate-100 hover:border-yellow-600 hover:bg-slate-700/40'
                      }`}
                  >
                    <div className="campaign-status text-sm font-semibold">{countryCode}</div>
                    <div className="text-xs text-slate-300 font-mono">{voters} voters</div>
                    <div className="text-xs text-slate-400 truncate">{countryData?.hos ?? '—'}</div>
                    {!countryData?.blocs && (
                      <div className="text-xs text-slate-500 truncate">Unimodal electorate</div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedCountry && (
              <div className="bg-slate-900/40 border border-slate-700 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-200 font-mono">
                <span className="campaign-status text-yellow-400 text-xs">Selected: {selectedCountry}</span>
                <span>Electorate {selectedPopulation}</span>
                <span>Head of State {selectedHos}</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 space-y-0.5">
            <p>Political Playground © 2025-2026</p>
            <p>Fictional election simulator &middot; Version {VERSION}</p>
            {analyticsConfigured && (
              <p>
                {analyticsBlocked ? (
                  <span>Anonymous analytics blocked by your browser&apos;s Do Not Track setting.</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !analyticsOff;
                      setAnalyticsOptedOut(next);
                      setAnalyticsOff(next);
                    }}
                    className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
                  >
                    {analyticsOff ? 'Enable anonymous analytics' : 'Disable anonymous analytics'}
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
