'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Event, EventChoice } from '@/types/game';
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
      if (pollsSinceEvent >= 2 && Math.random() < 0.7) {
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
        <div className="relative max-w-7xl mx-auto px-4 py-3">
          <div className="text-center mb-2">
            <h1 className="newspaper-header text-3xl font-black text-white mb-1 tracking-tight">
              THE CAMPAIGN TRIBUNE
            </h1>
            <div className="border-t border-b border-red-500 py-1 my-1">
              <p className="campaign-status text-xs text-red-200 tracking-widest">
                LIVE ELECTION COVERAGE • CAMPAIGN HEADQUARTERS
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="bg-red-700 px-3 py-1 rounded vintage-border text-white">
              <h2 className="newspaper-header text-lg font-bold mb-0">
                {state.country.toUpperCase()} ELECTION
              </h2>
              <p className="news-body text-red-100 text-sm">
                Campaign: {state.playerCandidate?.party} • {state.playerCandidate?.name}
              </p>
            </div>
            <div className="campaign-board px-4 py-2 rounded-lg text-center text-white">
              <div className="campaign-status text-lg font-bold text-green-400">
                WEEK {state.currentPoll}/{state.totalPolls}
              </div>
              <div className="text-xs text-slate-300">
                {weeksLeft} weeks to election day
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Content - Newspaper Style */}
          <div className="lg:col-span-2 space-y-4">
            {/* Campaign Progress - Status Board Style */}
            <div className="campaign-board p-4 rounded-lg text-white">
              <h2 className="campaign-status text-sm font-bold text-green-400 mb-2">CAMPAIGN STATUS MONITOR</h2>
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
              <div className="bg-stone-50 vintage-border p-4 relative" style={{ background: 'var(--newspaper-bg)' }}>
                <div className="absolute top-0 left-0 bg-red-700 text-white px-2 py-0.5 text-xs font-bold">
                  BREAKING
                </div>
                <h2 className="newspaper-header text-xl font-black text-slate-900 mb-3 mt-2 border-b border-slate-800 pb-1">
                  📰 POLITICAL BULLETIN
                </h2>
                <div className="space-y-2">
                  {state.politicalNews.slice(0, 2).map((news, index) => (
                    <article key={index} className="border-l-2 border-red-600 pl-3 py-1">
                      <p className="news-body text-slate-800 text-sm leading-tight font-medium">
                        {news}
                      </p>
                      <div className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wide">
                        Tribune Political Desk • Week {state.currentPoll}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Next Poll Button - Campaign HQ Style */}
            {!currentEvent && (
            <div className="campaign-board p-4 rounded-lg text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20"></div>
              <div className="relative">
                {state.currentPoll === 0 ? (
                  <button
                    onClick={actions.startCampaign}
                    className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm shadow-lg"
                  >
                    🚀 LAUNCH CAMPAIGN
                  </button>
                ) : state.currentPoll >= state.totalPolls ? (
                  <div className="text-lg font-bold text-yellow-400 campaign-status">
                    🗳️ ELECTION DAY - POLLS CLOSED
                  </div>
                ) : (
                  <button
                    onClick={actions.nextPoll}
                    className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm shadow-lg"
                  >
                    {state.currentPoll === state.totalPolls - 1 ? '📊 FINAL POLLING' : '📊 NEXT POLL'}
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
            <div className="campaign-board p-3 rounded-lg sticky top-4">
              <h3 className="campaign-status text-sm font-bold text-yellow-400 mb-2 text-center border-b border-slate-600 pb-1">
                POLLING DATA
              </h3>
              <PollResults />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
