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
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl w-full max-h-[80vh] overflow-y-auto border-2 border-red-200">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold mb-2">🚨 BREAKING NEWS</h2>
          <h3 className="text-xl">{event.title}</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg mb-6 leading-relaxed">
            {event.description}
          </p>

          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            How do you respond?
          </h4>

          <div className="space-y-3">
            {event.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoice(choice)}
                className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 group-hover:text-blue-800">
                      {choice.text}
                    </p>
                    {choice.boost > 20 && (
                      <div className="text-xs text-orange-600 mt-1 font-medium">
                        🔥 High media attention
                      </div>
                    )}
                    {choice.boost > 15 && choice.boost <= 20 && (
                      <div className="text-xs text-blue-600 mt-1">
                        📺 Moderate coverage
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Your choice will affect your political positions and polling.
            </p>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip Event
            </button>
          </div>
        </div>
      </div>
  );
}
