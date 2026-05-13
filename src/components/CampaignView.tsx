import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Event, EventChoice, VALUES, PoliticalValueKey } from '@/types/game';
import { getRandomPaperAssignment, getPriorityBadge, type PaperAssignment } from '@/lib/newsPaperStyles';
import PollResults from './PollResults';
import EventModal from './EventModal';
import PollingGraphModal from './PollingGraphModal';
import IdeologyScatterPlot from './IdeologyScatterPlot';
import { instantiateEvent, loadEventVariables, EventVariables } from '@/lib/eventTemplates';
import { exportSaveGame } from '@/lib/saveManager';
import { VERSION } from '@/lib/version';


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

  // Helper: check if an event affects the targeted axis
  const eventMatchesAxis = (ev: Event, axis: string): boolean => {
    // Check if any choice affects the target axis
    return ev.choices.some(choice => {
      const effectKeys = Object.keys(choice.effect) as Array<keyof typeof choice.effect>;
      return effectKeys.some(k => k === axis && (choice.effect[k] ?? 0) !== 0);
    });
  };

  useEffect(() => {
    // Check if we should show an event
    if (state.currentPoll < state.totalPolls - 2 && events.length > 0 && eventVariables && !currentEvent) {
      const pollsSinceEvent = state.currentPoll - lastEventPoll;

      // Present event every 3-4 polls
      if (pollsSinceEvent >= 3 && Math.random() < 0.6) {
        const TREND_WEIGHT_MULTIPLIER = 8;
        const activeTrendAxes = new Set(state.activeTrend.map(t => t.valueKey));

        const weights = events.map(ev => {
          if (ev.categories && ev.categories.some(cat => activeTrendAxes.has(cat))) {
            return TREND_WEIGHT_MULTIPLIER;
          }
          return 1;
        });

        const pickWeightedEvent = (): Event => {
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          let pick = Math.random() * totalWeight;
          let eventIndex = 0;
          for (let i = 0; i < weights.length; i++) {
            pick -= weights[i];
            if (pick <= 0) { eventIndex = i; break; }
          }
          return events[eventIndex];
        };

        let pickedEvent = pickWeightedEvent();

        // Axis targeting: re-roll up to 3 more times if the picked event
        // doesn't affect the player's targeted axis
        if (state.targetedAxis) {
          for (let retry = 0; retry < 7; retry++) {
            if (eventMatchesAxis(pickedEvent, state.targetedAxis)) break;
            pickedEvent = pickWeightedEvent();
          }
        }

        const instantiatedEvent = instantiateEvent(pickedEvent, eventVariables, state.country);

        setNewsSource(getRandomNewspaper());
        setCurrentEvent(instantiatedEvent);
        setLastEventPoll(state.currentPoll);
      }
    }
  }, [state.currentPoll, events, eventVariables, lastEventPoll, state.country, state.targetedAxis, state.totalPolls]);

  // Handle specially queued player events like post-election leadership crises
  useEffect(() => {
    if (state.pendingPlayerEvent && !currentEvent) {
      setNewsSource('The Daily News'); // Generic source for internal party crises
      setCurrentEvent(state.pendingPlayerEvent);
    }
  }, [state.pendingPlayerEvent, currentEvent]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0 });
  };

  const handleEventChoice = (event: Event, choice: EventChoice) => {
    actions.handleEvent(event, choice);

    // If the choice initiates a game phase change, don't tick the week forward
    if (choice.internalAction?.type === 'START_COALITION' || choice.internalAction?.type === 'AUTO_FORM_GOVERNMENT') {
      setCurrentEvent(null);
      scrollToTop();
      return;
    }

    if (state.currentPoll === 0) {
      actions.startCampaign();
    } else {
      actions.nextPoll();
    }
    setCurrentEvent(null);
    scrollToTop();
  };

  const weeksLeft = state.totalPolls - state.currentPoll;
  const canViewPollingGraph = state.pollingHistory.length > 0;

  const AXIS_LABELS: Record<PoliticalValueKey, { label: string; low: string; high: string }> = {
    prog_cons: { label: 'Prog ↔ Cons', low: 'Progressive', high: 'Conservative' },
    nat_glob: { label: 'Nat ↔ Glob', low: 'Nationalist', high: 'Globalist' },
    env_eco: { label: 'Env ↔ Eco', low: 'Environmental', high: 'Economic' },
    soc_cap: { label: 'Soc ↔ Cap', low: 'Socialist', high: 'Capitalist' },
    pac_mil: { label: 'Pac ↔ Mil', low: 'Pacifist', high: 'Militarist' },
    auth_ana: { label: 'Auth ↔ Ana', low: 'Authoritarian', high: 'Anarchist' },
    rel_sec: { label: 'Rel ↔ Sec', low: 'Religious', high: 'Secular' },
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      {/* Newspaper Header Banner */}
      <div className="bg-slate-900 text-white border-b-2 border-red-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-blue-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 py-1 sm:py-2">
          <div className="text-center mb-1 sm:mb-2">
            <h1 className="border-b border-red-500 pb-2 newspaper-header text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight inline-block">
              THE POLITICAL PLAYGROUND
            </h1>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <div className="campaign-board w-full sm:mr-6 p-3 sm:p-4 rounded-lg text-white">
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





            {/* Political News - Masonry Card Grid */}
            {state.politicalNews.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 relative">
                <div className="absolute -top-2 -left-2 bg-red-600 border border-red-500 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded shadow-lg transform -rotate-2 z-10">
                  NEWS FEED
                </div>

                {/* CSS Columns masonry — responsive: 3 cols desktop, 2 tablet, 1 mobile */}
                <div className="mt-3 news-masonry">
                  {state.politicalNews.map((item, idx) => {
                    const paper: PaperAssignment = getRandomPaperAssignment(eventVariables, state.country);
                    const style = paper.style;
                    const isCritical = item.priority === 'critical';
                    const badge = getPriorityBadge(item.priority);

                    return (
                      <div
                        key={idx}
                        className="overflow-hidden border"
                        style={{
                          backgroundColor: style.cardBg,
                          color: style.cardFg,
                          borderColor: style.accent,
                          fontFamily: style.bodyFont,
                        }}
                      >
                        {/* Top Bar Header */}
                        {style.headerLayout === 'topBar' && (
                          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{
                            backgroundColor: style.headerBg,
                            color: style.headerFg,
                            borderColor: style.accent,
                            fontFamily: style.headerFont,
                          }}>
                            <span className="text-[10px] sm:text-xs font-bold tracking-wider" style={{ color: style.headerFg }}>
                              {style.uppercase ? paper.name.toUpperCase() : paper.name}
                            </span>
                            {badge && (
                              <span className="text-[8px] font-black text-white uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: badge.bg }}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Full Header */}
                        {style.headerLayout === 'fullHeader' && (
                          <div className="px-3 py-2" style={{ backgroundColor: style.headerBg, color: style.headerFg, fontFamily: style.headerFont }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] sm:text-xs font-bold tracking-wider">
                                {style.uppercase ? paper.name.toUpperCase() : paper.name}
                              </span>
                              {badge && (
                                <span className="text-[8px] font-black text-white uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: badge.bg }}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Body */}
                        <div className="px-3 py-2.5" style={{ fontFamily: style.headlineFont }}>
                          {(style.headerLayout !== 'topBar' && style.headerLayout !== 'fullHeader') && (
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[9px] font-bold tracking-wide opacity-70" style={{ fontFamily: style.headerFont, color: style.accent }}>
                                {style.uppercase ? paper.name.toUpperCase() : paper.name}
                              </span>
                              {badge && (
                                <span className="text-[8px] font-black text-white uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: badge.bg }}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          )}
                          <p className={`leading-snug ${isCritical ? 'text-sm sm:text-base font-black' : 'text-xs sm:text-sm font-bold'}`}
                            style={{ textTransform: style.uppercase ? 'uppercase' : 'none', letterSpacing: style.uppercase ? '0.02em' : 'normal' }}>
                            {item.text}
                          </p>
                        </div>

                        {/* Bottom Bar */}
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
                      onClick={() => {
                        actions.startCampaign();
                        scrollToTop();
                      }}
                      className="px-6 sm:px-8 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 campaign-status text-sm sm:text-base shadow-lg w-full sm:w-auto"
                    >
                      LAUNCH CAMPAIGN
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        actions.nextPoll();
                        scrollToTop();
                      }}
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
                eventVariables={eventVariables}
                country={state.country}
              />
            )}
          </div>

          {/* Sidebar - Campaign Status Board */}
          <div className="lg:col-span-2">
            <div className="campaign-board p-2 sm:p-3 rounded-lg lg:sticky lg:top-4">
              <h3 className="campaign-status text-xs sm:text-sm font-bold text-yellow-400 mb-2 text-center border-b border-slate-600 pb-1">

                {state.incumbentGovernment && state.incumbentGovernment.length > 0 && (
                  <div>
                    <span className="font-bold text-xs truncate mr-2">
                      PM: {state.candidates.find(c => c.party === state.incumbentGovernment![0])?.name || 'Unknown'}
                    </span>
                    <span className="text-slate-400 text-xs truncate">({state.incumbentGovernment[0]})</span>
                  </div>
                )}

              </h3>
              <PollResults
                onViewGraph={() => setShowPollingGraph(true)}
                canViewGraph={canViewPollingGraph}
              />

              <div className="mt-3 border-t border-slate-600 pt-3">
                <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Campaign Focus
                </div>
                {state.targetingCooldown && state.targetingCooldown > 0 ? (
                  <div className="text-[10px] sm:text-xs text-slate-500 text-center italic">
                    {state.targetingCooldown} week{state.targetingCooldown !== 1 ? 's' : ''} until available
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {VALUES.map(axis => {
                        const ax = AXIS_LABELS[axis];
                        const isTargeted = state.targetedAxis === axis;
                        return (
                          <button
                            key={axis}
                            onClick={() => actions.setTargetedAxis(isTargeted ? null : axis)}
                            className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border transition-all duration-200 ${
                              isTargeted
                                ? 'border-yellow-400 bg-yellow-900/40 text-yellow-200 font-bold'
                                : 'border-slate-600 bg-slate-800/40 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                            }`}
                            title={isTargeted ? `Targeting: ${ax.low} ↔ ${ax.high}` : `Target ${ax.low} ↔ ${ax.high} events`}
                          >
                            {ax.label}
                          </button>
                        );
                      })}
                    </div>
                    {state.targetedAxis && (
                      <div className="text-[9px] text-yellow-400/70 text-center mt-1.5 italic">
                        Events favouring {AXIS_LABELS[state.targetedAxis].low}↔{AXIS_LABELS[state.targetedAxis].high} are more likely
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
            <IdeologyScatterPlot candidates={state.candidates} title="Party Ideology Map" />
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
          <p>Fictional election simulator.</p>
          <p>Created by <a href="https://indigo.spot">Indigo Nolan</a></p>
          <p>Version {VERSION}</p>
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
