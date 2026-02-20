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
    <div className="w-full relative bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl overflow-hidden mt-4">
      {/* Alert Strip */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 animate-pulse"></div>
        <div className="relative py-1.5 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white text-xs font-mono font-bold tracking-widest uppercase">STORY OF THE WEEK</span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          <span className="text-white/80 text-[10px] font-mono italic">{newsSource}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 sm:p-5">
        <div className="text-center mb-4">
          <h2 className="campaign-status text-xl sm:text-2xl font-black text-white leading-tight uppercase mb-2">
            {event.title}
          </h2>
          <div className="w-12 h-1 bg-red-500 mx-auto rounded-full"></div>
        </div>

        {/* Story Body */}
        <div className="max-w-3xl mx-auto">
          {/* Lead Paragraph */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mb-4">
            <p className="text-slate-200 text-sm sm:text-base font-medium leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Response Options Section */}
          <div className="space-y-2">
            <h3 className="campaign-status text-xs font-bold text-yellow-400 mb-2">STRATEGIC RESPONSE REQUIRED</h3>
            <div className="space-y-2">
              {event.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoice(choice)}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-blue-400 transition-all duration-200 group relative overflow-hidden rounded-lg shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 transform translate-x-full group-hover:translate-x-0 transition-transform duration-200"></div>

                  <div className="p-3 flex items-start gap-3">
                    {/* Choice Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base leading-snug mb-2">
                        {choice.text}
                      </p>

                      {/* Media Coverage Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {choice.boost > 20 && (
                          <div className="inline-flex items-center gap-1 bg-red-900 border border-red-500 text-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded">
                            <span>Major Coverage</span>
                          </div>
                        )}
                        {choice.boost > 15 && choice.boost <= 20 && (
                          <div className="inline-flex items-center gap-1 bg-orange-900 border border-orange-500 text-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded">
                            <span>Moderate Coverage</span>
                          </div>
                        )}
                        {choice.boost > 10 && choice.boost <= 15 && (
                          <div className="inline-flex items-center gap-1 bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded">
                            <span>Minor Coverage</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-400 transition-colors duration-200 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
