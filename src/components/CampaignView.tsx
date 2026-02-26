import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Event, EventChoice } from '@/types/game';
import PollResults from './PollResults';
import EventModal from './EventModal';
import PollingGraphModal from './PollingGraphModal';
import { instantiateEvent, loadEventVariables, EventVariables } from '@/lib/eventTemplates';
import { exportSaveGame } from '@/lib/saveManager';

export default function CampaignView() {
  const { state, actions } = useGame();
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventVariables, setEventVariables] = useState<EventVariables | null>(null);
  const [lastEventPoll, setLastEventPoll] = useState(0);
  const [showPollingGraph, setShowPollingGraph] = useState(false);
  const [newsSource, setNewsSource] = useState<string>('');

  // Function to get random newspaper name
  const getRandomNewspaper = () => {
    if (!eventVariables) return 'The Daily News';

    const countryNewspapers = eventVariables.countrySpecific?.[state.country]?.newspaper;
    const genericNewspapers = eventVariables.generic?.newspaper;

    const newspapers = countryNewspapers && countryNewspapers.length > 0
      ? countryNewspapers
      : genericNewspapers || ['The Daily News'];

    return newspapers[Math.floor(Math.random() * newspapers.length)];
  };

  useEffect(() => {
    fetch('/data/events.json')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Failed to load events:', err));

    // Load event variables for template substitution
    loadEventVariables()
      .then(vars => setEventVariables(vars))
      .catch(err => console.error('Failed to load event variables:', err));
  }, []);

  useEffect(() => {
    // Check if we should show an event
    if (state.currentPoll < state.totalPolls - 2 && events.length > 0 && eventVariables) {
      const pollsSinceEvent = state.currentPoll - lastEventPoll;

      // Present event every 3-4 polls
      if (pollsSinceEvent >= 3 && Math.random() < 0.6) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];

        // Instantiate the event with variable substitution
        const instantiatedEvent = instantiateEvent(randomEvent, eventVariables, state.country);

        // Set a random newspaper source for this event
        setNewsSource(getRandomNewspaper());

        setCurrentEvent(instantiatedEvent);
        setLastEventPoll(state.currentPoll);
      }
    }
  }, [state.currentPoll, events, eventVariables, lastEventPoll, state.country]);

  const handleEventChoice = (event: Event, choice: EventChoice) => {
    actions.handleEvent(event, choice);
    actions.nextPoll();
    setCurrentEvent(null);
  };

  const weeksLeft = state.totalPolls - state.currentPoll;
  const canViewPollingGraph = state.pollingHistory.length > 0;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f6f0 0%, #e7e5e4 50%, #d6d3d1 100%)' }}>
      {/* Newspaper Header Banner */}
      <div className="bg-slate-900 text-white border-b-2 border-red-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-blue-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 py-1 sm:py-2">
          <div className="text-center mb-1 sm:mb-2">
            <h1 className=" border-b border-red-500 pb-2 newspaper-header text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
              THE POLITICAL PLAYGROUND
            </h1>

          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <div className="campaign-board w-full mr-6 p-3 sm:p-4 rounded-lg text-white">
              <div className="w-full bg-slate-600 rounded-full h-2 mb-2 border border-slate-500">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${(state.currentPoll / state.totalPolls) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span className="bg-slate-700 px-1 py-0.5 rounded">LAUNCH</span>
                <span className="bg-green-600 px-1 py-0.5 rounded font-bold">WEEK {state.currentPoll}</span>
                <span className="bg-red-600 px-1 py-0.5 rounded">ELECTION DAY</span>
              </div>
            </div>
            <div className="campaign-board px-3 sm:px-4 py-2 rounded-lg text-center text-white w-full sm:w-auto">
              <div className="campaign-status text-base sm:text-lg font-bold text-green-400">
                WEEK {state.currentPoll}/{state.totalPolls}
              </div>
              <div className="text-xs text-slate-300 campaign-status mt-1">
                {state.country.toUpperCase()} • {state.playerCandidate?.party.toUpperCase()} • {state.playerCandidate?.name.toUpperCase()}
              </div>
            </div>
            {/* Campaign Progress - Status Board Style */}


          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="grid lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Main Content - Newspaper Style */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">





            {/* Political News - Dashboard Style */}
            {state.politicalNews.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 relative">
                <div className="absolute -top-2 -left-2 bg-red-600 border border-red-500 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded shadow-lg transform -rotate-2">
                  NEWS FEED
                </div>

                {(() => {
                  const NEWS_SLOTS = 7;

                  // Each trend gets a priority index based on how far through its lifetime it is.
                  // Fresh trends (remainingWeeks ≈ duration) → index 0 (top).
                  // Expiring trends (remainingWeeks ≈ 0) → near the bottom.
                  const trendEntries = state.activeTrend.map(trend => {
                    const progress = 1 - (trend.remainingWeeks / trend.duration); // 0 (new) → 1 (expired)
                    const insertAt = Math.round(progress * (NEWS_SLOTS - 1));
                    return { type: 'trend' as const, trend, insertAt };
                  });

                  // Build the base news list (up to NEWS_SLOTS items)
                  const baseNews = state.politicalNews.slice(0, NEWS_SLOTS).map((news, i) => ({
                    type: 'news' as const, news, originalIdx: i
                  }));

                  // Splice each trend into the news list at its computed position,
                  // then trim back to NEWS_SLOTS so the grid never overflows.
                  // Sort trends by insertAt ascending so earlier ones go in first without offsetting later ones.
                  const feed: Array<
                    { type: 'trend'; trend: typeof trendEntries[0]['trend']; insertAt: number } |
                    { type: 'news'; news: string; originalIdx: number }
                  > = [...baseNews];

                  [...trendEntries].sort((a, b) => a.insertAt - b.insertAt).forEach(({ trend, insertAt }) => {
                    const pos = Math.min(insertAt, feed.length);
                    feed.splice(pos, 0, { type: 'trend', trend, insertAt });
                  });

                  const trimmed = feed.slice(0, NEWS_SLOTS);

                  return (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {trimmed.map((item, idx) => {
                        const isFirst = idx === 0;

                        if (item.type === 'trend') {
                          return (
                            <div
                              key={`trend-${item.trend.id}`}
                              className={`${isFirst ? 'sm:col-span-2 lg:col-span-2' : ''} border border-red-500/60 bg-red-900/20 rounded-lg overflow-hidden`}
                            >
                              <div className={`p-2 ${isFirst ? 'sm:p-3' : ''} flex gap-3`}>
                                <div className="w-1 bg-red-500 rounded-full flex-shrink-0"></div>
                                <div>
                                  <span className="text-[10px] text-red-400 font-mono italic font-bold uppercase tracking-wider">Nationwide Trend</span>
                                  <h3 className={`${isFirst ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'} font-bold text-white leading-snug mt-0.5`}>
                                    {item.trend.title}
                                  </h3>
                                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                                    {item.trend.description}
                                  </p>
                                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide mt-1">
                                    Week {state.currentPoll} · {item.trend.remainingWeeks}w remaining
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const newspaper = getRandomNewspaper();

                        if (isFirst) {
                          return (
                            <div key={`news-${item.originalIdx}`} className="sm:col-span-2 lg:col-span-2 border border-slate-600 bg-slate-700/50 rounded-lg overflow-hidden">
                              <div className="p-2 sm:p-3 flex gap-3">
                                <div className="w-1 bg-red-500 rounded-full"></div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] text-slate-400 font-mono italic">{newspaper}</span>
                                  </div>
                                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                                    {item.news}
                                  </h3>
                                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide mt-1">
                                    Week {state.currentPoll}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={`news-${item.originalIdx}`} className="border border-slate-600/50 bg-slate-700/30 rounded-lg overflow-hidden">
                            <div className="p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-[10px] text-slate-400 font-mono italic truncate">{newspaper}</span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                                {item.news}
                              </h4>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Next Poll Button - Campaign HQ Style */}
            {!currentEvent && (
              <div className="campaign-board p-3 sm:p-4 rounded-lg text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20"></div>
                <div className="relative">
                  {state.currentPoll === 0 ? (
                    <button
                      onClick={actions.startCampaign}
                      className="px-6 sm:px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm sm:text-base shadow-lg w-full sm:w-auto"
                    >
                      LAUNCH CAMPAIGN
                    </button>
                  ) : (
                    <button
                      onClick={actions.nextPoll}
                      className="px-6 sm:px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm sm:text-base shadow-lg w-full sm:w-auto"
                    >
                      {state.currentPoll === state.totalPolls - 1 ? 'FINAL POLLING' : 'CONTINUE >'}
                    </button>
                  )}
                </div>
              </div>)}


            {/* Event Modal - positioned below Next Poll button */}
            {currentEvent && (
              <EventModal
                event={currentEvent}
                onChoice={(choice) => handleEventChoice(currentEvent, choice)}
                onClose={() => setCurrentEvent(null)}
                newsSource={newsSource}
              />
            )}
          </div>

          {/* Sidebar - Campaign Status Board */}
          <div className="lg:col-span-2">
            <div className="campaign-board p-2 sm:p-3 rounded-lg lg:sticky lg:top-4">
              <h3 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2 text-center border-b border-slate-600 pb-1">
                POLLING DATA
              </h3>
              <PollResults
                onViewGraph={() => setShowPollingGraph(true)}
                canViewGraph={canViewPollingGraph}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => exportSaveGame(state)}
          className="mt-8 align-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors self-start sm:self-center "
        >
          Save Progress
        </button>
        <div className="text-center text-xs text-slate-400 space-y-1 mt-10">
          <p>Political Playground © 2025-2026</p>
          <p>Fictional simulator. No real-world accuracy, endorsement or advice.</p>
          <p>Created by <a href="https://indigo.spot">Indigo Nolan</a></p>
        </div>
      </div>
      {showPollingGraph && (
        <PollingGraphModal
          open={showPollingGraph}
          onClose={() => setShowPollingGraph(false)}
          history={state.pollingHistory}
          candidates={state.candidates}
        />
      )}
    </div>
  );
}
