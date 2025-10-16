import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Event, EventChoice } from '../types/game';
import PollResults from './PollResults';
import EventModal from './EventModal';

export default function CampaignView() {
  const { state, actions } = useGame();
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [lastEventPoll, setLastEventPoll] = useState(0);

  useEffect(() => {
    fetch('/data/events.json')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Failed to load events:', err));
  }, []);

  useEffect(() => {
    // Check if we should show an event
    if (state.currentPoll < state.totalPolls - 2 && events.length > 0) {
      const pollsSinceEvent = state.currentPoll - lastEventPoll;
      
      // Present event every 2-3 polls
      if (pollsSinceEvent >= 2 && Math.random() < 0.4) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setCurrentEvent(randomEvent);
        setLastEventPoll(state.currentPoll);
      }
    }
  }, [state.currentPoll, events, lastEventPoll]);

  const handleEventChoice = (event: Event, choice: EventChoice) => {
    actions.handleEvent(event, choice);
    actions.nextPoll();
    setCurrentEvent(null);
  };

  const weeksLeft = state.totalPolls - state.currentPoll;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f6f0 0%, #e7e5e4 50%, #d6d3d1 100%)' }}>
      {/* Newspaper Header Banner */}
      <div className="bg-slate-900 text-white border-b-2 border-red-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-blue-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="text-center mb-1 sm:mb-2">
            <h1 className="newspaper-header text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
              THE POLITICAL PLAYGROUND
            </h1>
            <div className="border-t border-b border-red-500 py-1 my-1">
              <p className="campaign-status text-xs sm:text-sm text-red-200 tracking-widest">
                LIVE ELECTION COVERAGE • CAMPAIGN HEADQUARTERS • FICTIONAL SIMULATION
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <div className="bg-red-700 px-2 sm:px-3 py-1 rounded vintage-border text-white w-full sm:w-auto">
              <h2 className="newspaper-header text-base sm:text-lg font-bold mb-0">
                {state.country.toUpperCase()} ELECTION
              </h2>
              <p className="news-body text-red-100 text-xs sm:text-sm">
                Campaign: {state.playerCandidate?.party} • {state.playerCandidate?.name}
              </p>
            </div>
            <div className="campaign-board px-3 sm:px-4 py-2 rounded-lg text-center text-white w-full sm:w-auto">
              <div className="campaign-status text-base sm:text-lg font-bold text-green-400">
                WEEK {state.currentPoll}/{state.totalPolls}
              </div>
              <div className="text-xs text-slate-300">
                {weeksLeft} weeks to election day
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Main Content - Newspaper Style */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Campaign Progress - Status Board Style */}
            <div className="campaign-board p-3 sm:p-4 rounded-lg text-white">
              <h2 className="campaign-status text-xs sm:text-sm font-bold text-green-400 mb-2">CAMPAIGN STATUS MONITOR</h2>
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

            {/* Political News - Newspaper Style */}
            {state.politicalNews.length > 0 && (
              <div className="uppercase bg-stone-50 vintage-border p-3 sm:p-4 relative newspaper-section" style={{ background: 'var(--newspaper-bg)' }}>
                <div className="absolute top-0 left-0 bg-red-700 text-white px-2 py-0.5 text-xs font-bold tracking-widest shadow">
                  BREAKING
                </div>
                <h2 className="newspaper-header text-lg sm:text-xl font-black text-slate-900 mb-2 sm:mb-3 mt-2 border-b border-slate-800 pb-1 tracking-tight">
                  📰 HEADLINES AROUND THE COUNTRY
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 2. Map over the ENTIRE politicalNews array (up to 7 items) */}
  {state.politicalNews.slice(0, 7).map((news, idx) => {
    
    {/* 3. Check if it's the first item (index === 0) to render the main headline */}
    if (idx === 0) {
      return (
        <div key={idx} className="sm:col-span-2 lg:col-span-2 border-l-4 border-red-700 pl-3 py-2 bg-white/80 rounded shadow">
          {/* Main headline content */}
          <h3 className={`${news.split(' ').length > 10 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-extrabold text-slate-900 leading-tight mb-1 font-serif uppercase`}>
            {news}
          </h3>
          <div className="text-xs text-slate-500 font-mono uppercase tracking-wide">
            breaking news • Week {state.currentPoll}
          </div>
        </div>
      );
    }
    
    {/* 4. For all other items, render the smaller sub-story article */}
    return (
      <article key={idx} className="border-l-2 border-slate-400 pl-2 py-1 bg-white/60 rounded">
        <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5 font-serif">
          {news}
        </h4>
      </article>
    );
  })}
</div>
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
                    🚀 LAUNCH CAMPAIGN
                  </button>
                ) : state.currentPoll >= state.totalPolls ? (
                  <div className="text-base sm:text-lg font-bold text-yellow-400 campaign-status">
                    🗳️ ELECTION DAY - POLLS CLOSED
                  </div>
                ) : (
                  <button
                    onClick={actions.nextPoll}
                    className="px-6 sm:px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm sm:text-base shadow-lg w-full sm:w-auto"
                  >
                    {state.currentPoll === state.totalPolls - 1 ? '📊 FINAL POLLING' : '📊 CONTINUE'}
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
              />
            )}
          </div>

          {/* Sidebar - Campaign Status Board */}
          <div className="lg:col-span-1">
            <div className="campaign-board p-2 sm:p-3 rounded-lg lg:sticky lg:top-4">
              <h3 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2 text-center border-b border-slate-600 pb-1">
                POLLING DATA
              </h3>
              <PollResults />
            </div>
          </div>
        </div>

        {/* Add disclaimer footer */}
        <div className="mt-6 text-center border-t border-gray-300 pt-4">
          <p className="text-gray-500 text-xs max-w-2xl mx-auto">
            <strong>Simulation Notice:</strong> This is a fictional political simulation purely for entertainment purposes. 
            Events and outcomes are simplified and do not reflect real political complexity or accurate demographic data.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Created by <a href="https://indigo.spot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline font-medium transition-colors">Indigo Nolan</a>
          </p>
        </div>
      </div>
    </div>
  );
}
