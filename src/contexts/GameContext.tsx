import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { GameState, Candidate, PollResult, Event, EventChoice, CoalitionState, PollingSnapshot, PoliticalValues } from '@/types/game';
import { 
  generateVotingData, 
  conductPoll, 
  applyEventEffect, 
  createCandidate,
  createTrend,
  applyTrendStep,
  formatTrendStartHeadline,
  scheduleNextTrendPoll
} from '@/lib/gameEngine';
import { calculatePartyCompatibility } from '@/lib/coalitionEngine';
import { instantiateEvent, loadEventVariables, EventVariables } from '@/lib/eventTemplates';

interface GameContextType {
  state: GameState;
  actions: {
    setCountry: (country: string, countryData: any) => void;
    setPartyList: (partyList: string, parties: any[]) => void;
    setPlayerCandidate: (candidateId: number) => void;
    startCampaign: () => void;
    nextPoll: () => void;
    handleEvent: (event: Event, choice: EventChoice) => void;
    resetGame: () => void;
    setPendingParties: (parties: any[]) => void;
    setGamePhase: (phase: GameState['phase']) => void;
    startCoalitionFormation: () => void;
    addCoalitionPartner: (partner: Candidate) => void;
    removePotentialPartner: (partner: Candidate) => void;
    allocateCabinetPosition: (position: string, party: string) => void;
    completeCoalitionFormation: () => void;
    setTargetedBloc: (blocId: string | null) => void;
  };
}

type GameAction = 
  | { type: 'SET_COUNTRY'; payload: { country: string; countryData: any } }
  | { type: 'SET_PARTY_LIST'; payload: { partyList: string; parties: any[] } }
  | { type: 'SET_PLAYER_CANDIDATE'; payload: { candidateId: number } }
  | { type: 'START_CAMPAIGN' }
  | { type: 'NEXT_POLL' }
  | { type: 'HANDLE_EVENT'; payload: { event: Event; choice: EventChoice } }
  | { type: 'RESET_GAME' }
  | { type: 'SET_PENDING_PARTIES'; payload: { parties: any[] } }
  | { type: 'SET_GAME_PHASE'; payload: { phase: GameState['phase'] } }
  | { type: 'START_COALITION_FORMATION' }
  | { type: 'ADD_COALITION_PARTNER'; payload: { partner: Candidate } }
  | { type: 'REMOVE_POTENTIAL_PARTNER'; payload: { partner: Candidate } }
  | { type: 'ALLOCATE_CABINET_POSITION'; payload: { position: string; party: string } }
  | { type: 'COMPLETE_COALITION_FORMATION' }
  | { type: 'SET_EVENT_VARIABLES'; payload: { eventVariables: EventVariables } }
  | { type: 'SET_TARGETED_BLOC'; payload: { blocId: string | null } };

// Helper function to substitute variables in news templates
function substituteNewsVariables(
  template: string,
  vars: Record<string, string>,
  eventVars: EventVariables | null,
  country: string
): string {
  // Apply explicit vars first (they have priority)
  let text = template;
  Object.keys(vars).forEach(k => {
    if (!vars[k]) return;
    const re = new RegExp(`\\{${k}\\}`, 'g');
    text = text.replace(re, vars[k]);
  });

  // Replace {country}
  if (text.includes('{country}')) {
    text = text.replace(/\{country\}/g, country);
  }

  // If we have event variables, use the same instantiation logic as events
  if (eventVars) {
    try {
      const placeholderEvent = { title: text, description: '', choices: [] } as unknown as Event;
      const instantiated = instantiateEvent(placeholderEvent, eventVars, country);
      return instantiated.title;
    } catch (e) {
      // Last-resort fallback: attempt generic/country picks as before
      return text.replace(/\{(\w+)\}/g, (m, key) => {
        const countryVars = eventVars.countrySpecific?.[country];
        const hasCountry = countryVars && countryVars[key] && countryVars[key].length > 0;
        const hasGeneric = eventVars.generic[key] && eventVars.generic[key].length > 0;
        if (hasCountry && Math.random() < 0.6) return countryVars[key][Math.floor(Math.random() * countryVars[key].length)];
        if (hasCountry && !hasGeneric) return countryVars[key][Math.floor(Math.random() * countryVars[key].length)];
        if (hasGeneric) return eventVars.generic[key][Math.floor(Math.random() * eventVars.generic[key].length)];
        return m;
      });
    }
  }

  // No event variables available — return text with explicit vars applied
  return text;
}

const initialState: GameState = {
  country: '',
  countryData: { pop: 0, vals: { prog_cons: 0, nat_glob: 0, env_eco: 0, soc_cap: 0, pac_mil: 0, auth_ana: 0, rel_sec: 0 }, scale: 1, hos: '' },
  partyList: '',
  candidates: [],
  playerCandidate: null,
  currentPoll: 0,
  totalPolls: 52, // POLL COUNTER, 52 DEFAULT
  pollResults: [],
  previousPollResults: {},
  initialPollResults: {},
  politicalNews: [],
  playerEventNews: [],
  votingData: [],
  pendingParties: [],
  coalitionState: undefined,
  phase: 'setup',
  pollingHistory: [],
  activeTrend: null,
  trendHistory: [],
  nextTrendPoll: null,
  eventVariables: null,
  targetedBlocId: null,
  targetingStartWeek: null,
  targetingCooldownUntil: null
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_COUNTRY':
      return {
        ...state,
        country: action.payload.country,
        countryData: action.payload.countryData,
        totalPolls: action.payload.countryData.totalPolls || 52, // Use totalPolls if provided
        phase: 'party-selection',
        activeTrend: null,
        trendHistory: [],
        nextTrendPoll: null
      };
      
    case 'SET_PARTY_LIST':
      const candidates = action.payload.parties.map((party, index) => 
        createCandidate(
          index,
          party.name,
          party.party,
          party.party_pop,
          party.prog_cons,
          party.nat_glob,
          party.env_eco,
          party.soc_cap,
          party.pac_mil,
          party.auth_ana,
          party.rel_sec,
          party.colour,
          party.swing
        )
      );
      
      return {
        ...state,
        partyList: action.payload.partyList,
        candidates,
        phase: 'player-selection'
      };
      
    case 'SET_PLAYER_CANDIDATE':
      const updatedCandidates = state.candidates.map(candidate => ({
        ...candidate,
        is_player: candidate.id === action.payload.candidateId
      }));
      
      const playerCandidate = updatedCandidates.find(c => c.is_player) || null;
      
      return {
        ...state,
        candidates: updatedCandidates,
        playerCandidate,
        phase: 'campaign'
      };
      
    case 'START_CAMPAIGN':
      const votingData = generateVotingData(state.countryData);
      const { results, blocStats } = conductPoll(votingData, state.candidates, 1, state.countryData);
      
      // Store initial poll results
      const initialResults: Record<string, number> = {};
      results.forEach(result => {
        initialResults[result.candidate.party] = result.percentage;
      });

      const initialPollingSnapshot: PollingSnapshot = {
        week: 1,
        percentages: { ...initialResults }
      };
      
      return {
        ...state,
        votingData,
        pollResults: results,
        initialPollResults: initialResults,
        previousPollResults: initialResults,
        currentPoll: 1,
        politicalNews: ["ELECTION SEASON OFFICIALLY BEGINS.."],
        pollingHistory: [initialPollingSnapshot],
        activeTrend: null,
        trendHistory: [],
        nextTrendPoll: scheduleNextTrendPoll(1),
        blocStats,
        previousBlocStats: blocStats
      };
      
    case 'NEXT_POLL':
      if (state.currentPoll >= state.totalPolls) return state;
      
      const nextPollNum = state.currentPoll + 1;
      const trendNews: string[] = [];
      let activeTrend = state.activeTrend;
      let trendHistory = state.trendHistory;
      let nextTrendPoll = state.nextTrendPoll;
      let updatedCountryValues = state.countryData.vals;
      const votingDataRef = state.votingData;

      if (!activeTrend && nextTrendPoll !== null && nextPollNum >= nextTrendPoll && nextPollNum < state.totalPolls) {
        const previousKey = trendHistory.length > 0 ? trendHistory[trendHistory.length - 1].valueKey : undefined;
        const newTrend = createTrend(nextPollNum, previousKey);
        trendNews.push(formatTrendStartHeadline(newTrend));
        const stepResult = applyTrendStep(newTrend, updatedCountryValues, votingDataRef);
        updatedCountryValues = stepResult.values;
        if (stepResult.ongoingNews) {
          trendNews.push(stepResult.ongoingNews);
        }
        if (stepResult.completionNews) {
          trendNews.push(stepResult.completionNews);
        }
        if (stepResult.completedTrend) {
          trendHistory = [...trendHistory, stepResult.completedTrend];
          activeTrend = null;
          nextTrendPoll = scheduleNextTrendPoll(nextPollNum);
        } else {
          activeTrend = stepResult.trend;
          nextTrendPoll = null;
        }
      } else if (activeTrend) {
        const stepResult = applyTrendStep(activeTrend, updatedCountryValues, votingDataRef);
        updatedCountryValues = stepResult.values;
        if (stepResult.ongoingNews) {
          trendNews.push(stepResult.ongoingNews);
        }
        if (stepResult.completionNews) {
          trendNews.push(stepResult.completionNews);
        }
        if (stepResult.completedTrend) {
          trendHistory = [...trendHistory, stepResult.completedTrend];
          activeTrend = null;
          nextTrendPoll = scheduleNextTrendPoll(nextPollNum);
        } else {
          activeTrend = stepResult.trend;
        }
      }

      const countryDataAfterTrend = updatedCountryValues === state.countryData.vals
        ? state.countryData
        : { ...state.countryData, vals: updatedCountryValues };

      const { results: newResults, newsEvents, blocStats: newBlocStats } = conductPoll(votingDataRef, state.candidates, nextPollNum, countryDataAfterTrend);
      
      // --- BEGIN: Apply bloc targeting ideology shift ---
      let updatedTargetedBlocId = state.targetedBlocId;
      let updatedTargetingStartWeek = state.targetingStartWeek;
      let updatedTargetingCooldownUntil = state.targetingCooldownUntil;
      
      // Check if we need to end targeting due to 6-week limit
      if (state.targetedBlocId && state.targetingStartWeek !== null && state.targetingStartWeek !== undefined) {
        const weeksTargeting = nextPollNum - state.targetingStartWeek;
        
        if (weeksTargeting >= 6) {
          // End targeting and start cooldown
          updatedTargetedBlocId = null;
          updatedTargetingStartWeek = null;
          updatedTargetingCooldownUntil = nextPollNum + 3; // 3 week cooldown
        }
      }
      
      // Apply targeting shift if still active
      if (updatedTargetedBlocId && countryDataAfterTrend.blocs) {
        const targetedBloc = countryDataAfterTrend.blocs.find(b => b.id === updatedTargetedBlocId);
        if (targetedBloc) {
          const playerCandidate = state.candidates.find(c => c.is_player);
          if (playerCandidate) {
            // Shift 1% of the difference towards the bloc center on each axis
            const axisKeys: (keyof PoliticalValues)[] = ['prog_cons', 'nat_glob', 'env_eco', 'soc_cap', 'pac_mil', 'auth_ana', 'rel_sec'];
            axisKeys.forEach((key, index) => {
              const currentValue = playerCandidate.vals[index];
              const targetValue = targetedBloc.center[key];
              const difference = targetValue - currentValue;
              const shift = difference * 0.01; // 1% of the difference
              playerCandidate.vals[index] = Math.max(-100, Math.min(100, currentValue + shift));
            });
          }
        }
      }
      // --- END: Apply bloc targeting ideology shift ---
      
      // Update previous poll results
      const newPreviousResults: Record<string, number> = {};
      newResults.forEach(result => {
        newPreviousResults[result.candidate.party] = result.percentage;
      });
      
      // Calculate changes from previous poll
      const resultsWithChange = newResults.map(result => ({
        ...result,
        change: result.percentage - (state.previousPollResults[result.candidate.party] || result.percentage)
      }));

      // --- BEGIN: Add news for all parties with polling surges/drops ---
      const partyPollingNews: string[] = [];
      resultsWithChange.forEach(result => {

        const newsTitle = (Math.random() < 0.7 ? result.candidate.party : result.candidate.name )
        
    
        if (Math.random() < 0.4 || (result.candidate === state.playerCandidate)) {
          if (Math.abs(result.change) > 2.5) {
              if (result.change > 0) {
                const surgeMessages = [
  `${newsTitle} surges in polls`,
  `${newsTitle} enjoys new wave of support`,
  `Polls show sharp rise for ${newsTitle}`,
  `Momentum shifts to ${newsTitle}`,
  `${newsTitle} gaining ground`,
  `Is ${newsTitle} the new people's party?`,
  `Voters flock to ${newsTitle} after stunning debate performance`,
  `{social_media_platform} buzz: ${newsTitle} trending nationwide`,
  `Analysts stunned by ${newsTitle}'s meteoric rise`,
  `Rival parties scramble as ${newsTitle} dominates headlines`,
  `${newsTitle} fever sweeps the nation!`,
  `Is this the start of a new era for ${newsTitle}?`,

  // NEW ONES BELOW
  `${newsTitle} shatters expectations with record poll numbers`,
  `Historic surge propels ${newsTitle} to front-runner status`,
  `Wave of enthusiasm lifts ${newsTitle} across {region}`,
  `Crowds pack rallies as excitement grows around ${newsTitle}`,
  `Polling landslide puts ${newsTitle} far ahead of rivals`,
  `${newsTitle} dominates {city} in unprecedented show of support`,
  `Analysts: ${newsTitle} unstoppable after breakthrough week`,
  `National mood swings decisively toward ${newsTitle}`,
  `Voters rally behind ${newsTitle} in dramatic surge`,
  `${newsTitle} sets new popularity records in {foreign_country}`,
  `Grassroots explosion fuels rapid rise of ${newsTitle}`,
  `${newsTitle} campaign electrifies young voters nationwide`,
  `Momentum skyrockets following major speech by ${newsTitle}`,
  `Rival leaders concede ground as ${newsTitle} widens lead`,
  `Polling shock: ${newsTitle} takes commanding advantage`,
  `Surge in donations underscores public enthusiasm for ${newsTitle}`,
  `${newsTitle} hailed as transformative force by supporters`,
  `Experts predict landslide potential for ${newsTitle}`,
  `Nationwide rallies signal seismic shift toward ${newsTitle}`,
  `All eyes on ${newsTitle} after stunning surge to the top`
];

                const template = surgeMessages[Math.floor(Math.random() * surgeMessages.length)];
                partyPollingNews.push(substituteNewsVariables(
                  template,
                  { newsTitle },
                  state.eventVariables,
                  state.country
                ));
              } else {
                const loseMessages = [
  `${newsTitle} loses ground following controversy`,
  `Support for ${newsTitle} drops sharply`,
  `Polls decline for ${newsTitle} amid public backlash`,
  `${newsTitle} faces harsh criticism`,
  `Polls plummet for ${newsTitle}`,
  `Scandal rocks ${newsTitle} campaign—voters flee`,
  `${newsTitle} in meltdown after disastrous interview`,
  `Analysts: ${newsTitle} struggles to recover from backlash`,
  `Rival parties surge as ${newsTitle} stumbles`,
  `Is this the end of the road for ${newsTitle}?`,

  // NEW ONES BELOW
  `${newsTitle} collapses in key polls across {region}`,
  `Confidence in ${newsTitle} evaporates after new revelations`,
  `Major defections leave ${newsTitle} reeling`,
  `${newsTitle} loses control of narrative amid scandal`,
  `Voters abandon ${newsTitle} in droves after policy fiasco`,
  `${newsTitle} suffers worst polling numbers in years`,
  `Internal divisions deepen crisis for ${newsTitle}`,
  `${newsTitle} hammered by losses in {city}`,
  `Backlash intensifies against ${newsTitle} across {foreign_country}`,
  `Analysts warn of freefall for ${newsTitle} support`,
  `${newsTitle} leadership questioned as ratings crash`,
  `Public trust in ${newsTitle} hits new low`,
  `Disastrous results leave ${newsTitle} scrambling for answers`,
  `${newsTitle} blamed for economic missteps—polling nosedives`,
  `Crisis talks held as ${newsTitle} hemorrhages support`,
  `Voters turn away from ${newsTitle} after bruising week`,
  `Opinion polls paint bleak picture for ${newsTitle}`,
  `Party insiders fear irreversible decline of ${newsTitle}`,
  `${newsTitle} routed in {region} after public backlash`,
  `Experts: recovery path for ${newsTitle} looks increasingly unlikely`
];

                const template = loseMessages[Math.floor(Math.random() * loseMessages.length)];
                partyPollingNews.push(substituteNewsVariables(
                  template,
                  { newsTitle },
                  state.eventVariables,
                  state.country
                ));
              }
            } else if (Math.abs(result.change) > 1) {
              if (result.change > 0) {
                const steadyMessages = [
  `${newsTitle} climbing as unemployment rises`,
  `${newsTitle} wins local elections in {region}`,
  `Popular policy platform of ${newsTitle} released`,
  `${newsTitle} clear winner in debate`,
  `${newsTitle} sees steady rise in {region}`,
  `{organisation} endorses ${newsTitle}'s policy platform`,
  `${newsTitle} quietly gaining momentum`,
  `Analysts note consistent growth for ${newsTitle}`,
  `Grassroots movement in {city} boosts ${newsTitle}`,
  `Voters warming to ${newsTitle}'s message`,

  // NEW ONES BELOW
  `${newsTitle} posts modest gains in latest polling`,
  `Support for ${newsTitle} edges upward across key regions`,
  `Analysts see positive trajectory forming for ${newsTitle}`,
  `${newsTitle} benefits from improving public sentiment`,
  `Steady approval uptick gives ${newsTitle} fresh confidence`,
  `Polling suggests gradual rise in backing for ${newsTitle}`,
  `${newsTitle} credited with pragmatic, stable leadership`,
  `Cautious optimism surrounds ${newsTitle}'s performance`,
  `New volunteers flock to ${newsTitle} campaign efforts`,
  `Regional rallies signal renewed energy for ${newsTitle}`,
  `Voters cite competence and stability in support of ${newsTitle}`,
  `${newsTitle} strengthens position among undecided voters`,
  `Early results indicate favorable trend for ${newsTitle}`,
  `Media coverage highlights quiet successes of ${newsTitle}`,
  `Slow but sure progress reported for ${newsTitle}`,
  `Survey in {region} shows incremental approval gains for ${newsTitle}`,
  `${newsTitle} gains credibility after policy rollout`,
  `{foreign_country} boosts public image of ${newsTitle}`,
  `Momentum gradually building behind ${newsTitle}`,
  `${newsTitle} performance exceeds expectations in new poll`
];

                const template = steadyMessages[Math.floor(Math.random() * steadyMessages.length)];
                partyPollingNews.push(substituteNewsVariables(
                  template,
                  { newsTitle },
                  state.eventVariables,
                  state.country
                ));
              } else {
                const mixedMessages = [
  `Mixed pundit reaction to ${newsTitle}`,
  `Support slipping for ${newsTitle}`,
  `Public opinion divided over ${newsTitle}`,
  `Voters express uncertainty about ${newsTitle}'s direction`,
  `{organisation} slams ${newsTitle}'s new proposal`,
  `${newsTitle} struggles to find momentum`,
  `Analysts: ${newsTitle} can't shake off negative headlines`,
  `Voters lukewarm on ${newsTitle} as rivals gain ground`,
  `${newsTitle} faces uphill battle to win back trust`,
  `Polls show ${newsTitle} losing steam week after week`,

  // NEW ONES BELOW
  `${newsTitle} rattled by declining approval ratings`,
  `Internal doubts grow as ${newsTitle} stumbles in polls`,
  `Key supporters in {city} drift away from ${newsTitle}`,
  `Survey suggests confidence waning in ${newsTitle}`,
  `${newsTitle} leadership under pressure amid poll slide`,
  `Grassroots enthusiasm fades for ${newsTitle}`,
  `Critics say ${newsTitle} has lost touch with voters`,
  `Momentum shifts against ${newsTitle} after recent setbacks`,
  `Warning signs emerge for ${newsTitle} in new polling`,
  `Voter fatigue threatens ${newsTitle}'s campaign`,
  `Rivals capitalise as backing erodes for ${newsTitle}`,
  `${newsTitle} grapples with shrinking base of support`,
  `Disappointing turnout signals trouble for ${newsTitle}`,
  `Confidence crisis looms for ${newsTitle}`,
  `${newsTitle} hit by wave of negative public sentiment`,
  `Analysts warn of downward trend for ${newsTitle}`,
  `Polling experts: support for ${newsTitle} softening`,
  `Donors uneasy as support for ${newsTitle} dips`,
  `Public trust in ${newsTitle} shows signs of erosion`,
  `${newsTitle} struggles to control narrative amid losses`
];

                const template = mixedMessages[Math.floor(Math.random() * mixedMessages.length)];
                newsEvents.push(substituteNewsVariables(
                  template,
                  { newsTitle },
                  state.eventVariables,
                  state.country
                ));
              }
            }
        }

        
        // Generate news based on polling impact
  

       
      });
      // --- END: Add news for all parties with polling surges/drops ---

      // --- BEGIN: Random gaffe/positive events for non-player parties ---
      const randomRivalEvents: string[] = [];
      
      const GAFFE_TEMPLATES = [
        `{candidate_name} caught in embarrassing {social_media_platform} scandal`,
        `{party} candidate arrested at {city} rally`,
        `Leaked emails reveal {candidate_name}'s ties to {company}`,
        `{leader_name} makes offensive comments about {religious_group}`,
        `{party} campaign funds linked to {organisation}`,
        `{candidate_name} caught lying about qualifications`,
        `{party} leader booed off stage in {region}`,
        `{leader_name}'s past statements resurface, spark outrage`,
        `{candidate_name} accused of accepting bribes from {company}`,
        `{party} suffers major defections in {city}`,
        `{leader_name} makes bizarre claims about {industry}`,
        `Shocking video of {candidate_name} goes viral on {social_media_platform}`,
        `{party} campaign in chaos after major internal split`,
        `{leader_name} embarrassed at debate with factual errors`,
        `{candidate_name} faces backlash over {foreign_country} remarks`
      ];

      const POSITIVE_TEMPLATES = [
        `{candidate_name} receives surprise endorsement from {organisation}`,
        `{party} rallies thousands in {city}`,
        `{leader_name} praised by {industry} leaders`,
        `{candidate_name} unveils popular new {region} policy`,
        `{party} campaign donations surge after {social_media_platform} viral moment`,
        `{leader_name} wins over voters with emotional speech in {city}`,
        `{candidate_name} receives standing ovation in {region}`,
        `{party} praised by {organisation} for policy innovation`,
        `{leader_name}'s {industry} background wins support`,
        `{candidate_name} gains momentum with {religious_group} voters`,
        `{party} secures key endorsement from {foreign_country} diplomat`,
        `{leader_name}'s grassroots movement spreads across {region}`,
        `{candidate_name} delivers knockout blow in debate`,
        `{party} volunteer numbers double in {city}`,
        `{leader_name} connects with working-class voters in {region}`
      ];

      // Filter for non-player parties
      const nonPlayerCandidates = state.candidates.filter(c => !c.is_player);
      
      nonPlayerCandidates.forEach(candidate => {
        // 10-15% chance per party per poll for a random event
        if (Math.random() < 0.125) {
          const isGaffe = Math.random() < 0.5;
          const templates = isGaffe ? GAFFE_TEMPLATES : POSITIVE_TEMPLATES;
          const template = templates[Math.floor(Math.random() * templates.length)];
          
          // Randomly choose between party name and leader name for variety
          const useLeaderName = Math.random() < 0.5;
          
          const newsText = substituteNewsVariables(
            template,
            {
              candidate_name: candidate.name,
              party: candidate.party,
              leader_name: useLeaderName ? candidate.name : candidate.party
            },
            state.eventVariables,
            state.country
          );
          
          randomRivalEvents.push(newsText);
          
          // Apply small popularity impacts
          const targetCandidate = state.candidates.find(c => c.name === candidate.name);
          if (targetCandidate) {
            if (isGaffe) {
              targetCandidate.party_pop = Math.max(0, targetCandidate.party_pop - (1 + Math.random() * 2));
            } else {
              targetCandidate.party_pop = Math.min(100, targetCandidate.party_pop + (1 + Math.random() * 1));
            }
          }
        }
      });
      // --- END: Random gaffe/positive events for non-player parties ---

      // --- BEGIN: Random position shifts for non-player parties ---
      const positionShiftNews: string[] = [];
      
      const POSITION_SHIFT_TEMPLATES: Record<string, { positive: string[]; negative: string[] }> = {
        prog_cons: {
          positive: [
            `{party} embraces progressive values on social issues`,
            `{leader_name} shifts party platform to the left`,
            `{party} adopts progressive stance on {social_media_platform} debate`,
            `{candidate_name} announces progressive policy reforms`
          ],
          negative: [
            `{party} pivots toward conservative values`,
            `{leader_name} shifts party to the right on social issues`,
            `{party} adopts traditional conservative platform`,
            `{candidate_name} embraces conservative fiscal policy`
          ]
        },
        nat_glob: {
          positive: [
            `{party} champions global cooperation with {foreign_country}`,
            `{leader_name} embraces international trade agreements`,
            `{party} shifts toward globalist economic policy`,
            `{candidate_name} promotes international partnerships`
          ],
          negative: [
            `{party} adopts nationalist "country first" platform`,
            `{leader_name} shifts to protectionist trade policy`,
            `{party} champions national sovereignty over global treaties`,
            `{candidate_name} pivots to nationalist rhetoric`
          ]
        },
        env_eco: {
          positive: [
            `{party} shifts focus to economic growth over environment`,
            `{leader_name} prioritizes {industry} development`,
            `{party} adopts pro-business economic platform`,
            `{candidate_name} announces business-friendly policy shift`
          ],
          negative: [
            `{party} unveils ambitious environmental protection plan`,
            `{leader_name} shifts party toward green policies`,
            `{party} prioritizes climate action over {industry} growth`,
            `{candidate_name} embraces environmental activism`
          ]
        },
        soc_cap: {
          positive: [
            `{party} shifts toward free-market capitalism`,
            `{leader_name} embraces pro-business economic policy`,
            `{party} adopts capitalist reforms for {industry}`,
            `{candidate_name} champions private sector growth`
          ],
          negative: [
            `{party} shifts left on economic redistribution`,
            `{leader_name} embraces socialist policies`,
            `{party} proposes wealth redistribution reforms`,
            `{candidate_name} champions worker ownership in {industry}`
          ]
        },
        pac_mil: {
          positive: [
            `{party} announces military spending increase`,
            `{leader_name} takes hawkish stance on {foreign_country}`,
            `{party} shifts toward aggressive defense policy`,
            `{candidate_name} champions military modernization`
          ],
          negative: [
            `{party} shifts toward pacifist foreign policy`,
            `{leader_name} proposes military spending cuts`,
            `{party} embraces diplomatic solutions over military action`,
            `{candidate_name} champions peace negotiations with {foreign_country}`
          ]
        },
        auth_ana: {
          positive: [
            `{party} shifts toward libertarian principles`,
            `{leader_name} champions individual freedoms`,
            `{party} proposes sweeping deregulation of {industry}`,
            `{candidate_name} embraces anarchist decentralization`
          ],
          negative: [
            `{party} shifts toward law and order platform`,
            `{leader_name} champions strong centralized government`,
            `{party} proposes authoritarian crime crackdown`,
            `{candidate_name} embraces strict regulatory framework`
          ]
        },
        rel_sec: {
          positive: [
            `{party} shifts toward secular governance`,
            `{leader_name} champions separation of church and state`,
            `{party} adopts secular approach to social policy`,
            `{candidate_name} embraces secular humanist values`
          ],
          negative: [
            `{party} embraces faith-based policy platform`,
            `{leader_name} shifts toward religious values`,
            `{party} champions {religious_group} interests`,
            `{candidate_name} adopts religious conservative stance`
          ]
        }
      };

      nonPlayerCandidates.forEach(candidate => {
        // 8-10% chance per party per poll for a position shift
        if (Math.random() < 0.09) {
          // Pick a random axis to shift
          const axes: (keyof PoliticalValues)[] = ['prog_cons', 'nat_glob', 'env_eco', 'soc_cap', 'pac_mil', 'auth_ana', 'rel_sec'];
          const axisToShift = axes[Math.floor(Math.random() * axes.length)];
          
          // Shift amount: 5-10 points (similar to player events)
          const shiftAmount = (5 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1);
          
          // Find the actual candidate object to modify
          const targetCandidate = state.candidates.find(c => c.name === candidate.name);
          if (targetCandidate) {
            const axisIndex = axes.indexOf(axisToShift);
            targetCandidate.vals[axisIndex] = Math.max(-100, Math.min(100, targetCandidate.vals[axisIndex] + shiftAmount));
            
            // Generate appropriate news
            const isPositiveShift = shiftAmount > 0;
            const templates = POSITION_SHIFT_TEMPLATES[axisToShift];
            const templateArray = isPositiveShift ? templates.positive : templates.negative;
            const template = templateArray[Math.floor(Math.random() * templateArray.length)];
            
            const useLeaderName = Math.random() < 0.5;
            const newsText = substituteNewsVariables(
              template,
              {
                candidate_name: candidate.name,
                party: candidate.party,
                leader_name: useLeaderName ? candidate.name : candidate.party
              },
              state.eventVariables,
              state.country
            );
            
            positionShiftNews.push(newsText);
          }
        }
      });
      // --- END: Random position shifts for non-player parties ---

      // Combine all news sources into a single array first
      const allNewsItems = [
        ...trendNews,
        ...state.playerEventNews, 
        ...newsEvents, 
        ...partyPollingNews,
        ...randomRivalEvents,
        ...positionShiftNews
      ];

      // Sort the combined array by word count in ascending order.
      const sortedPoliticalNews = allNewsItems.sort((a, b) => {
        if (Math.random() < 0.6) {
          return (a.split(' ').length - b.split(' ').length);
        }
        else { return 1;}

      });

      return {
        ...state,
        currentPoll: nextPollNum,
        pollResults: resultsWithChange,
        previousPollResults: newPreviousResults,
        politicalNews: sortedPoliticalNews,
        playerEventNews: [],
        countryData: countryDataAfterTrend,
        activeTrend,
        trendHistory,
        nextTrendPoll,
        blocStats: newBlocStats,
        previousBlocStats: state.blocStats,
        targetedBlocId: updatedTargetedBlocId,
        targetingStartWeek: updatedTargetingStartWeek,
        targetingCooldownUntil: updatedTargetingCooldownUntil,
        pollingHistory: [
          ...state.pollingHistory,
          {
            week: nextPollNum,
            percentages: { ...newPreviousResults }
          }
        ],
        phase: nextPollNum >= state.totalPolls ? 'results' : 'campaign'
      };
      
    case 'HANDLE_EVENT':
      if (!state.playerCandidate) return state;
      
      // Create a copy of the player candidate to modify
      const updatedPlayerCandidate = { ...state.playerCandidate };
      
      const { pollingChange, newsEvents: eventNews } = applyEventEffect(
        updatedPlayerCandidate,
        action.payload.choice.effect,
        action.payload.choice.boost,
        state.countryData
      );
      
      // Update the candidates array with the modified player candidate
      const candidatesAfterEvent = state.candidates.map(candidate => 
        candidate.id === state.playerCandidate?.id ? updatedPlayerCandidate : candidate
      );
      
      return {
        ...state,
        playerCandidate: updatedPlayerCandidate,
        candidates: candidatesAfterEvent,
        playerEventNews: eventNews
      };
      
    case 'RESET_GAME':
      return initialState;
      
    case 'SET_PENDING_PARTIES':
      return {
        ...state,
        pendingParties: action.payload.parties
      };
      
    case 'SET_GAME_PHASE':
      return {
        ...state,
        phase: action.payload.phase
      };
      
    case 'START_COALITION_FORMATION':
      const sortedResults = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
      const winningParty = sortedResults[0].candidate;
      const winningPercentage = sortedResults[0].percentage;
      
      // Check if coalition is needed
      if (winningPercentage > 50) {
        return {
          ...state,
          phase: 'results' // Skip coalition if majority achieved
        };
      }
      
      // Determine available partners (excluding the winning party)
      const availablePartners = sortedResults
        .slice(1)
        .map(result => result.candidate)
        .filter(candidate => candidate.id !== winningParty.id);
      
      // Sort by compatibility with winning party
      const partnersWithCompatibility = availablePartners.map(partner => ({
        ...partner,
        compatibility: calculatePartyCompatibility(winningParty, partner)
      })).sort((a, b) => b.compatibility - a.compatibility);
      
      return {
        ...state,
        phase: 'coalition',
        coalitionState: {
          coalitionPartners: [winningParty],
          currentCoalitionPercentage: winningPercentage,
          availablePartners: partnersWithCompatibility,
          cabinetAllocations: {},
          isPlayerLead: winningParty.is_player,
          negotiationPhase: 'partner-selection'
        }
      };
      
    case 'ADD_COALITION_PARTNER':
      if (!state.coalitionState) return state;
      
      const partnerResult = state.pollResults.find(r => r.candidate.id === action.payload.partner.id);
      const partnerPercentage = partnerResult ? partnerResult.percentage : 0;
      const newTotalPercentage = state.coalitionState.currentCoalitionPercentage + partnerPercentage;
      
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          coalitionPartners: [...state.coalitionState.coalitionPartners, action.payload.partner],
          currentCoalitionPercentage: newTotalPercentage,
          availablePartners: state.coalitionState.availablePartners.filter(p => p.id !== action.payload.partner.id),
          // If we reach 50%+, mark as complete instead of cabinet-negotiation
          negotiationPhase: newTotalPercentage >= 50 ? 'complete' : 'partner-selection'
        }
      };
      
    case 'REMOVE_POTENTIAL_PARTNER':
      if (!state.coalitionState) return state;
      // Don't allow removing the lead party (first in coalitionPartners) from availablePartners
      if (action.payload.partner.id === state.coalitionState.coalitionPartners[0].id) return state;
      const updatedAvailablePartners = state.coalitionState.availablePartners.filter(
        p => p.id !== action.payload.partner.id
      );
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          availablePartners: updatedAvailablePartners,
          negotiationPhase: 'partner-selection'
        }
      };
      
    case 'ALLOCATE_CABINET_POSITION':
      if (!state.coalitionState) return state;
      
      const currentAllocations = { ...state.coalitionState.cabinetAllocations };
      if (!currentAllocations[action.payload.position]) {
        currentAllocations[action.payload.position] = [];
      }
      currentAllocations[action.payload.position].push(action.payload.party);
      
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          cabinetAllocations: currentAllocations
        }
      };
      
    case 'COMPLETE_COALITION_FORMATION':
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState!,
          negotiationPhase: 'complete'
        }
      };
      
    case 'SET_EVENT_VARIABLES':
      return {
        ...state,
        eventVariables: action.payload.eventVariables
      };
      
    case 'SET_TARGETED_BLOC':
      // If untargeting (blocId is null), trigger cooldown
      if (action.payload.blocId === null) {
        return {
          ...state,
          targetedBlocId: null,
          targetingStartWeek: null,
          targetingCooldownUntil: state.currentPoll + 3 // 3 week cooldown when manually stopped
        };
      }
      
      // If trying to target during cooldown, ignore
      if (state.targetingCooldownUntil !== null && state.targetingCooldownUntil !== undefined && state.currentPoll < state.targetingCooldownUntil) {
        return state; // Don't allow targeting during cooldown
      }
      
      // Start new targeting
      return {
        ...state,
        targetedBlocId: action.payload.blocId,
        targetingStartWeek: state.currentPoll,
        targetingCooldownUntil: null // Clear any old cooldown
      };
      
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Load event variables on mount
  useEffect(() => {
    loadEventVariables().then(vars => {
      dispatch({ type: 'SET_EVENT_VARIABLES', payload: { eventVariables: vars } });
    }).catch(err => {
      console.error('Failed to load event variables:', err);
    });
  }, []);
  
  const actions = {
    setCountry: useCallback((country: string, countryData: any) => {
      dispatch({ type: 'SET_COUNTRY', payload: { country, countryData } });
    }, []),
    
    setPartyList: useCallback((partyList: string, parties: any[]) => {
      dispatch({ type: 'SET_PARTY_LIST', payload: { partyList, parties } });
    }, []),
    
    setPlayerCandidate: useCallback((candidateId: number) => {
      dispatch({ type: 'SET_PLAYER_CANDIDATE', payload: { candidateId } });
    }, []),
    
    startCampaign: useCallback(() => {
      dispatch({ type: 'START_CAMPAIGN' });
    }, []),
    
    nextPoll: useCallback(() => {
      dispatch({ type: 'NEXT_POLL' });
    }, []),
    
    handleEvent: useCallback((event: Event, choice: EventChoice) => {
      dispatch({ type: 'HANDLE_EVENT', payload: { event, choice } });
    }, []),
    
    resetGame: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),
    
    setPendingParties: useCallback((parties: any[]) => {
      dispatch({ type: 'SET_PENDING_PARTIES', payload: { parties } });
    }, []),
    
    setGamePhase: useCallback((phase: GameState['phase']) => {
      dispatch({ type: 'SET_GAME_PHASE', payload: { phase } });
    }, []),
    
    startCoalitionFormation: useCallback(() => {
      dispatch({ type: 'START_COALITION_FORMATION' });
    }, []),
    
    addCoalitionPartner: useCallback((partner: Candidate) => {
      dispatch({ type: 'ADD_COALITION_PARTNER', payload: { partner } });
    }, []),

    removePotentialPartner: useCallback((partner: Candidate) => {
      dispatch({ type: 'REMOVE_POTENTIAL_PARTNER', payload: { partner } });
    }, []),

    allocateCabinetPosition: useCallback((position: string, party: string) => {
      dispatch({ type: 'ALLOCATE_CABINET_POSITION', payload: { position, party } });
    }, []),
    
    completeCoalitionFormation: useCallback(() => {
      dispatch({ type: 'COMPLETE_COALITION_FORMATION' });
    }, []),
    
    setTargetedBloc: useCallback((blocId: string | null) => {
      dispatch({ type: 'SET_TARGETED_BLOC', payload: { blocId } });
    }, [])
  };
  
  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
