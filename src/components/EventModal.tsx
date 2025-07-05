'use client';

import { Event, EventChoice } from '@/types/game';

interface EventModalProps {
  event: Event;
  onChoice: (choice: EventChoice) => void;
  onClose: () => void;
}

export default function EventModal({ event, onChoice, onClose }: EventModalProps) {
  const handleChoice = (choice: EventChoice) => {
    onChoice(choice);
  };  return (
    <div className="vintage-border w-full max-h-[60vh] overflow-y-auto relative" style={{ background: 'var(--newspaper-bg)' }}>
      {/* Urgent News Header */}
      <div className="urgent-banner text-white p-3 relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center justify-center mb-1">
            <div className="bg-white text-red-700 px-2 py-0.5 text-xs font-bold uppercase tracking-widest mr-3">
              URGENT
            </div>
            <h2 className="newspaper-header text-xl font-black tracking-tight">
              🚨 BREAKING NEWS ALERT
            </h2>
          </div>
          <h3 className="news-body text-lg text-center font-bold">{event.title}</h3>
        </div>
      </div>      {/* News Story Content */}
      <div className="p-4 bg-stone-50">
        <div className="border-l-2 border-red-600 pl-3 mb-4">
          <p className="news-body text-slate-800 text-sm leading-snug font-medium">
            {event.description}
          </p>
          <div className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wide">
            Tribune Political Desk • Developing Story
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
          <h4 className="newspaper-header text-lg font-bold text-slate-900 mb-3">
            CAMPAIGN RESPONSE OPTIONS
          </h4>

          <div className="space-y-2">
            {event.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoice(choice)}
                className="w-full p-3 text-left bg-stone-100 hover:bg-yellow-50 vintage-border hover:border-yellow-600 transition-all duration-200 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-start space-x-3">
                  <div className="bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:bg-yellow-600 transition-colors duration-200">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="news-body text-slate-800 group-hover:text-slate-900 font-medium text-sm leading-snug">
                      {choice.text}
                    </p>
                    {choice.boost > 20 && (
                      <div className="inline-block bg-red-600 text-white px-1 py-0.5 text-xs font-bold uppercase tracking-wide mt-1 rounded">
                        🔥 HIGH IMPACT
                      </div>
                    )}
                    {choice.boost > 15 && choice.boost <= 20 && (
                      <div className="inline-block bg-blue-600 text-white px-1 py-0.5 text-xs font-bold uppercase tracking-wide mt-1 rounded">
                        📺 MEDIA COVERAGE
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>      {/* Editorial Footer */}
      <div className="bg-slate-800 text-white px-4 py-2 border-t border-slate-700">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-300 font-mono">
            Tribune Editorial: Strategic decisions will impact polling and voter sentiment.
          </p>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors duration-200"
          >
            [Skip Event]
          </button>
        </div>
      </div>
      </div>
  );
}
