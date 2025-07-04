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
    setCurrentEvent(null);
  };

  const weeksLeft = state.totalPolls - state.currentPoll;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {state.country.toUpperCase()} ELECTION CAMPAIGN
              </h1>
              <p className="text-gray-600">
                Playing as {state.playerCandidate?.party} • Led by {state.playerCandidate?.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                Poll {state.currentPoll}/{state.totalPolls}
              </div>
              <div className="text-sm text-gray-600">
                {weeksLeft} weeks until election
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Progress */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Progress</h2>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(state.currentPoll / state.totalPolls) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Campaign Start</span>
                <span>Week {state.currentPoll}</span>
                <span>Election Day</span>
              </div>
            </div>

            {/* Political News */}
            {state.politicalNews.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📰 Political News</h2>
                <div className="space-y-3">
                  {state.politicalNews.slice(0, 3).map((news, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{news}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Poll Button */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                {state.currentPoll === 0 ? (
                  <button
                    onClick={actions.startCampaign}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200"
                  >
                    Start Campaign
                  </button>
                ) : state.currentPoll >= state.totalPolls ? (
                  <div className="text-lg font-bold text-gray-900">
                    🗳️ Election Day - Campaign Complete!
                  </div>
                ) : (
                  <button
                    onClick={actions.nextPoll}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
                  >
                    {state.currentPoll === state.totalPolls - 1 ? '📊 Final Poll' : '📊 Next Poll'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Poll Results */}
          <div className="lg:col-span-1">
            <PollResults />
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {currentEvent && (
        <EventModal
          event={currentEvent}
          onChoice={(choice) => handleEventChoice(currentEvent, choice)}
          onClose={() => setCurrentEvent(null)}
        />
      )}
    </div>
  );
}
