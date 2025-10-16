import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { GameState, Candidate, PollResult, Event, EventChoice, CoalitionState } from '../types/game';
import { 
  generateVotingData, 
  conductPoll, 
  applyEventEffect, 
  createCandidate 
} from '../lib/gameEngine';
import { calculatePartyCompatibility } from '../lib/coalitionEngine';

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
  | { type: 'COMPLETE_COALITION_FORMATION' };

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
  phase: 'setup'
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_COUNTRY':
      return {
        ...state,
        country: action.payload.country,
        countryData: action.payload.countryData,
        totalPolls: action.payload.countryData.totalPolls || 52, // Use totalPolls if provided
        phase: 'party-selection'
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
      const { results } = conductPoll(votingData, state.candidates, 1);
      
      // Store initial poll results
      const initialResults: Record<string, number> = {};
      results.forEach(result => {
        initialResults[result.candidate.party] = result.percentage;
      });
      
      return {
        ...state,
        votingData,
        pollResults: results,
        initialPollResults: initialResults,
        previousPollResults: initialResults,
        currentPoll: 1,
        politicalNews: ["ELECTION SEASON OFFICIALLY BEGINS.."]
      };
      
    case 'NEXT_POLL':
      if (state.currentPoll >= state.totalPolls) return state;
      
      const nextPollNum = state.currentPoll + 1;
      const { results: newResults, newsEvents } = conductPoll(state.votingData, state.candidates, nextPollNum);
      
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
                  `Social media buzz: ${newsTitle} trending nationwide`,
                  `Analysts stunned by ${newsTitle}'s meteoric rise`,
                  `Rival parties scramble as ${newsTitle} dominates headlines`,
                  `${newsTitle} fever sweeps the nation!`,
                  `Is this the start of a new era for ${newsTitle}?`

                ];
                partyPollingNews.push(surgeMessages[Math.floor(Math.random() * surgeMessages.length)]);
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
                  `Is this the end of the road for ${newsTitle}?`
                ];
                partyPollingNews.push(loseMessages[Math.floor(Math.random() * loseMessages.length)]);
              }
            } else if (Math.abs(result.change) > 1) {
              if (result.change > 0) {
                const steadyMessages = [
                  `${newsTitle} climbing as unemployment rises`,
                  `${newsTitle} wins local elections`,
                  `Popular policy platform of ${newsTitle} released`,
                  `${newsTitle} clear winner in debate`,
                  `${newsTitle} sees steady rise in local support`,
                  `The UN endorses ${newsTitle}'s policy platform`,
                  `${newsTitle} quietly gaining momentum`,
                  `Analysts note consistent growth for ${newsTitle}`,
                  `Grassroots movement boosts ${newsTitle}`,
                  `Voters warming to ${newsTitle}'s message`
                ];
                partyPollingNews.push(steadyMessages[Math.floor(Math.random() * steadyMessages.length)]);
              } else {
                const mixedMessages = [
                  `Mixed pundit reaction to ${newsTitle}`,
                  `Support slipping for ${newsTitle}`,
                  `Public opinion divided over ${newsTitle}`,
                  `Voters express uncertainty about ${newsTitle}'s direction`,
                  `The UN slams ${newsTitle}'s new proposal`,
                `${newsTitle} struggles to find momentum`,
                  `Analysts: ${newsTitle} can't shake off negative headlines`,
                  `Voters lukewarm on ${newsTitle} as rivals gain ground`,
                  `${newsTitle} faces uphill battle to win back trust`,
                  `Polls show ${newsTitle} losing steam week after week`
                ];
                newsEvents.push(mixedMessages[Math.floor(Math.random() * mixedMessages.length)]);
              }
            }
        }

        
        // Generate news based on polling impact
  

       
      });
      // --- END: Add news for all parties with polling surges/drops ---

      // Combine all news sources into a single array first
      const allNewsItems = [
        ...state.playerEventNews, 
        ...newsEvents, 
        ...partyPollingNews
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
      
    default:
      return state;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
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
