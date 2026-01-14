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
    <div className="w-full overflow-hidden relative bg-stone-100 border-4 border-double border-slate-900 shadow-2xl">
      {/* Dramatic Alert Strip */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20 animate-pulse"></div>
        <div className="relative py-1.5 px-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
           
  <span className="text-white text-xs font-mono italic">STORY OF THE WEEK</span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          </div>
      </div>

      {/* Main Headline Area */}
      <div className="bg-gradient-to-b from-stone-50 to-stone-100 border-b-2 border-slate-900 p-1 sm:p-3">
        <div className="text-center">
          
          <h2 className="newspaper-header text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight uppercase mb-2">
            {event.title}
          </h2>
          <div className="w-16 h-1 bg-red-700 mx-auto"></div>
        </div>
      </div>

      {/* Story Body */}
      <div className="p-2 sm:p-3 bg-stone-50">
        <div className="max-w-3xl mx-auto">
          {/* Lead Paragraph */}
          <div className="border-l-4 border-red-700 pl-2 mb-4 bg-white/50 py-1">
            <p className="news-body text-slate-900 text-lg sm:text-xl font-semibold leading-relaxed ">
              {event.description}
            </p>
          </div>

          {/* Response Options Section */}
          <div className="mt-3">
            

            <div className="space-y-1">
              {event.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoice(choice)}
                  className="w-full text-left bg-white border-2 border-slate-300 hover:border-yellow-600 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-white transition-all duration-200 group relative overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-0 right-0 w-1 h-full bg-yellow-600 transform translate-x-full group-hover:translate-x-0 transition-transform duration-200"></div>
                  
                  <div className="p-2 flex items-start gap-3">
                    

                    {/* Choice Content */}
                    <div className="flex-1 min-w-0">
                      <p className="news-body text-slate-900 font-medium text-sm sm:text-base leading-snug mb-1.5">
                        {choice.text}
                      </p>
                      
                      {/* Media Coverage Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {choice.boost > 20 && (
                          <div className="inline-flex items-center gap-1 bg-red-700 text-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded-sm">
                          
                            <span>Major Coverage</span>
                          </div>
                        )}
                        {choice.boost > 15 && choice.boost <= 20 && (
                          <div className="inline-flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded-sm">
                       
                            <span>Moderate Coverage</span>
                          </div>
                        )}
                        {choice.boost > 10 && choice.boost <= 15 && (
                          <div className="inline-flex items-center gap-1 bg-yellow-300 text-black px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded-sm">
                         
                            <span>Minor Coverage</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex-shrink-0 text-slate-400 group-hover:text-yellow-600 transition-colors duration-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editorial Note */}
          <div className="mt-2 pt-1 border-t-2 border-dashed border-slate-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 p-3 rounded">
          
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-wide transition-colors duration-200 whitespace-nowrap border border-slate-400 hover:border-slate-900 px-3 py-1.5 rounded"
              >
                Decline To Comment
              </button>
            </div>
          </div>
        </div>
      </div>

    
    </div>
  );
}
