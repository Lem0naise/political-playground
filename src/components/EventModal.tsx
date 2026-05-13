import { Event, EventChoice } from '@/types/game';
import { getRandomPaperAssignment, type PaperAssignment } from '@/lib/newsPaperStyles';

interface EventModalProps {
  event: Event;
  onChoice: (choice: EventChoice) => void;
  onClose: () => void;
  newsSource?: string;
  eventVariables?: any;
  country?: string;
}

export default function EventModal({ event, onChoice, onClose, newsSource, eventVariables, country }: EventModalProps) {
  const paper: PaperAssignment = getRandomPaperAssignment(eventVariables, country);
  const style = paper.style;

  const handleChoice = (choice: EventChoice) => {
    onChoice(choice);
  };

  return (
    <div className="w-full relative overflow-hidden mt-4 border shadow-lg" style={{
      backgroundColor: style.cardBg,
      color: style.cardFg,
      borderColor: style.accent,
      fontFamily: style.bodyFont,
    }}>
      {/* Newspaper Header */}
      {style.headerLayout === 'topBar' && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{
          backgroundColor: style.headerBg,
          color: style.headerFg,
          borderColor: style.accent,
          fontFamily: style.headerFont,
        }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: style.headerFg, borderRadius: '50%' }} />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider" style={{ color: style.headerFg }}>
              {style.uppercase ? paper.name.toUpperCase() : paper.name} — EXCLUSIVE
            </span>
          </div>
          <span className="text-[9px] italic opacity-70" style={{ color: style.headerFg }}>{newsSource || 'Breaking News'}</span>
        </div>
      )}

      {style.headerLayout === 'fullHeader' && (
        <div className="px-3 py-2" style={{ backgroundColor: style.headerBg, color: style.headerFg, fontFamily: style.headerFont }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold tracking-wider">
                {style.uppercase ? paper.name.toUpperCase() : paper.name} — EXCLUSIVE
              </span>
            </div>
            <span className="text-[9px] italic opacity-70">{newsSource || 'Breaking News'}</span>
          </div>
        </div>
      )}

      {(style.headerLayout !== 'topBar' && style.headerLayout !== 'fullHeader') && (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
          <span className="text-[10px] font-bold tracking-wide" style={{ color: style.accent, fontFamily: style.headerFont }}>
            {style.uppercase ? paper.name.toUpperCase() : paper.name} — EXCLUSIVE
          </span>
          <span className="text-[9px] italic opacity-50" style={{ color: style.cardFg }}>{newsSource || 'Breaking News'}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="px-3 sm:px-5 py-3 sm:py-4">
        <div className="text-center mb-4">
          <h2 className="font-black leading-tight mb-2" style={{
            fontFamily: style.headlineFont,
            fontSize: style.uppercase ? '1.1rem' : '1.25rem',
            textTransform: style.uppercase ? 'uppercase' : 'none',
            letterSpacing: style.uppercase ? '0.02em' : 'normal',
            color: style.cardFg,
          }}>
            {event.title}
          </h2>
          <div className="w-12 h-0.5 mx-auto" style={{ backgroundColor: style.accent }} />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="p-3 mb-4 border-l-4" style={{
            borderLeftColor: style.accent,
            backgroundColor: style.cardBg === '#FFFFFF' ? '#F8F8FA' : `${style.accent}15`,
            color: style.cardFg,
          }}>
            <p className="text-sm sm:text-base font-normal leading-relaxed" style={{ fontFamily: style.bodyFont, opacity: 0.9 }}>
              {event.description}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{
              color: style.accent,
              fontFamily: style.headerFont,
            }}>
              How will you respond?
            </h3>
            <div className="space-y-2">
              {event.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoice(choice)}
                  className="w-full text-left transition-all duration-200 group relative overflow-hidden border"
                  style={{
                    backgroundColor: style.cardBg === '#FFFFFF' ? '#F0F0F4' : `${style.headerBg}15`,
                    borderColor: style.accent,
                    color: style.cardFg,
                    borderRadius: 0,
                  }}
                >
                  <div className="p-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base leading-snug mb-2"
                        style={{ fontFamily: style.bodyFont, color: style.cardFg }}>
                        {choice.text}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {choice.boost > 20 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5"
                            style={{
                              backgroundColor: style.accent,
                              color: style.cardBg,
                              border: `1px solid ${style.accent}`
                            }}>
                            MAJOR COVERAGE
                          </span>
                        )}
                        {choice.boost > 15 && choice.boost <= 20 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5"
                            style={{
                              backgroundColor: 'transparent',
                              color: style.accent,
                              border: `1px solid ${style.accent}`
                            }}>
                            MODERATE COVERAGE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: style.accent }}>
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

      {/* Bottom bar for bottomBar layout */}
      {style.headerLayout === 'bottomBar' && (
        <div className="flex items-center justify-end px-3 py-1 border-t" style={{
          backgroundColor: style.headerBg,
          color: style.headerFg,
          borderColor: style.accent,
          fontFamily: style.headerFont,
        }}>
          <span className="text-[9px] font-bold tracking-wider" style={{ color: style.headerFg }}>
            {style.uppercase ? paper.name.toUpperCase() : paper.name}
          </span>
        </div>
      )}
    </div>
  );
}
