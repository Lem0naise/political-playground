import { Event, EventChoice } from '@/types/game';

interface EventModalProps {
  event: Event;
  onChoice: (choice: EventChoice) => void;
  onClose: () => void;
  newsSource?: string;
}

export default function EventModal({ event, onChoice, onClose, newsSource = 'Breaking News' }: EventModalProps) {
  const handleChoice = (choice: EventChoice) => {
    onChoice(choice);
  };

  return (
    <div className="vintage-border w-full overflow-y-auto relative" style={{ background: 'var(--newspaper-bg)' }}>
      {/* Urgent News Header */}
      <div className="urgent-banner text-white p-2 relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <div className="bg-white text-red-700 px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
              BREAKING
            </div>
            <span className="text-xs text-red-100 font-mono italic">{newsSource}</span>
          </div>
          <h2 className="newspaper-header uppercase text-lg sm:text-xl font-black tracking-tight text-center mt-1">
            {event.title}
          </h2>
        </div>
      </div>

      {/* News Story Content */}
      <div className="p-3 sm:p-4 bg-stone-50">
        <div className="border-l-2 border-red-600 pl-2 sm:pl-3 mb-3">
          <p className="news-body text-slate-800 text-base sm:text-lg font-bold leading-snug">
            {event.description}
          </p>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <div className="space-y-1.5 sm:space-y-2">
            {event.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoice(choice)}
                className="w-full p-2 text-left bg-stone-100 hover:bg-yellow-50 vintage-border hover:border-yellow-600 transition-all duration-200 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <div className="relative flex items-start space-x-2">
                  <div className="bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 group-hover:bg-yellow-600 transition-colors duration-200 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="news-body text-slate-800 group-hover:text-slate-900 font-medium text-xs sm:text-sm leading-snug">
                      {choice.text}
                    </p>
                    {choice.boost > 20 && (
                      <div className="inline-block bg-red-600 text-white px-1 py-0.5 text-xs font-bold uppercase tracking-wide mt-1 rounded">
                        HIGH COVERAGE
                      </div>
                    )}
                    {choice.boost > 15 && choice.boost <= 20 && (
                      <div className="inline-block bg-blue-600 text-white px-1 py-0.5 text-xs font-bold uppercase tracking-wide mt-1 rounded">
                        MEDIUM COVERAGE
                      </div>
                    )}
                    {choice.boost > 10 && choice.boost <= 15 && (
                      <div className="inline-block bg-yellow-600 text-white px-1 py-0.5 text-xs font-bold uppercase tracking-wide mt-1 rounded">
                        LOW COVERAGE
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editorial Footer */}
      <div className="bg-slate-800 text-white px-3 py-1.5 border-t border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0">
          <p className="text-xs text-slate-300 font-mono">
            Your response will impact polling and voter sentiment
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
