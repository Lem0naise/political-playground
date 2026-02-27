import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { GameState, Candidate, PollResult, Event, EventChoice, CoalitionState, PollingSnapshot, VoterTransferEntry, VALUES } from '@/types/game';
import {
  generateVotingData,
  conductPoll,
  applyEventEffect,
  createCandidate,
  snapshotInitialChoices,
  scheduleNextTrendPoll
} from '@/lib/gameEngine';
import { calculatePartyCompatibility, autoAllocateUnfilledCabinetPositions } from '@/lib/coalitionEngine';
import { instantiateEvent, loadEventVariables, EventVariables } from '@/lib/eventTemplates';
import { getIdeologyDescriptors, calculateWeightedIdeology } from '@/lib/ideologyProfiler';

import { calculateNextPollState } from '@/lib/reducerLogic';

interface GameContextType {
  state: GameState;
  actions: {
    setCountry: (country: string, countryData: any) => void;
    setPartyList: (partyList: string, parties: any[]) => void;
    setPlayerCandidate: (candidateId: number) => void;
    startCampaign: () => void;
    nextPoll: () => void;
    continueCampaign: () => void;
    loadState: (savedState: any) => void;
    handleEvent: (event: Event, choice: EventChoice) => void;
    resetGame: () => void;
    setPendingParties: (parties: any[]) => void;
    setGamePhase: (phase: GameState['phase']) => void;
    startCoalitionFormation: () => void;
    addCoalitionPartner: (partner: Candidate, positions?: string[]) => void;
    removePotentialPartner: (partner: Candidate) => void;
    allocateCabinetPosition: (position: string, party: string) => void;
    completeCoalitionFormation: () => void;
    setTargetedBloc: (blocId: string | null) => void;
    nextCoalitionAttempt: () => void;
    logCoalitionEvent: (message: string) => void;
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
  | { type: 'ADD_COALITION_PARTNER'; payload: { partner: Candidate; positions?: string[] } }
  | { type: 'REMOVE_POTENTIAL_PARTNER'; payload: { partner: Candidate } }
  | { type: 'ALLOCATE_CABINET_POSITION'; payload: { position: string; party: string } }
  | { type: 'COMPLETE_COALITION_FORMATION' }
  | { type: 'SET_EVENT_VARIABLES'; payload: { eventVariables: EventVariables } }
  | { type: 'SET_TARGETED_BLOC'; payload: { blocId: string | null } }
  | { type: 'NEXT_COALITION_ATTEMPT' }
  | { type: 'CONTINUE_CAMPAIGN' }
  | { type: 'LOAD_STATE'; payload: { savedState: any } }
  | { type: 'LOG_COALITION_EVENT'; payload: { message: string } };

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
  activeTrend: [],
  trendHistory: [],
  nextTrendPoll: null,
  eventVariables: null,
  targetedBlocId: null,
  targetingStartWeek: null,
  targetingWeeksActive: 0,
  initialBlocStats: undefined,
  blocStatsHistory: [],
  postElectionStats: undefined
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
        activeTrend: [],
        trendHistory: [],
        nextTrendPoll: null
      };

    case 'SET_PARTY_LIST': {
      const candidates = action.payload.parties.map((party, index) =>
        createCandidate(
          index,
          party.name,
          party.party,
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

      const votingData = state.votingData && state.votingData.length > 0
        ? state.votingData
        : generateVotingData(state.countryData);

      const { results } = conductPoll(votingData, candidates, 0, state.countryData, true);

      candidates.forEach(cand => {
        const res = results.find(r => r.candidate.id === cand.id);
        if (res) {
          cand.poll_percentage = res.percentage;
        }
      });

      return {
        ...state,
        partyList: action.payload.partyList,
        votingData,
        candidates,
        phase: 'player-selection'
      };
    }

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
      const votingData = state.votingData && state.votingData.length > 0
        ? state.votingData
        : generateVotingData(state.countryData);

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

      const nextState = {
        ...state,
        votingData,
        pollResults: results.map(r => ({ ...r, change: 0 })),
        initialPollResults: initialResults,
        previousPollResults: initialResults,
        currentPoll: 1,
        politicalNews: ["ELECTION SEASON OFFICIALLY BEGINS."],
        pollingHistory: [initialPollingSnapshot],
        activeTrend: state.activeTrend !== undefined ? state.activeTrend : [],
        trendHistory: state.trendHistory || [],
        nextTrendPoll: state.nextTrendPoll !== null && state.nextTrendPoll !== undefined
          ? state.nextTrendPoll
          : scheduleNextTrendPoll(1),
        blocStats,
        previousBlocStats: blocStats,
        initialBlocStats: blocStats,
        blocStatsHistory: blocStats ? [blocStats] : []
      };
      // Snapshot voter choices at poll 1 for transfer analysis (side-effect: safe in reducer)
      snapshotInitialChoices();
      return nextState;

    case 'NEXT_POLL':
      if (state.currentPoll >= state.totalPolls) return state;

      return calculateNextPollState(state);

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

    case 'SET_PENDING_PARTIES': {
      // Run a "Week 0" mock poll to determine initial sizes for merging and selection screens
      const tempCandidates = action.payload.parties.map((p, index) =>
        createCandidate(
          index,
          p.name,
          p.party,
          p.prog_cons,
          p.nat_glob,
          p.env_eco,
          p.soc_cap,
          p.pac_mil,
          p.auth_ana,
          p.rel_sec,
          p.colour,
          p.swing
        )
      );
      
      const votingData = state.votingData && state.votingData.length > 0
        ? state.votingData
        : generateVotingData(state.countryData);

      const { results } = conductPoll(votingData, tempCandidates, 0, state.countryData, true);

      const partiesWithSizes = action.payload.parties.map(p => {
        const candId = tempCandidates.find(c => c.party === p.party)?.id;
        const res = candId !== undefined ? results.find(r => r.candidate.id === candId) : null;
        return {
          ...p,
          poll_percentage: res ? res.percentage : 0
        };
      });

      return {
        ...state,
        votingData, // save voting data so it's not regenerated
        pendingParties: partiesWithSizes
      };
    }

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
          negotiationPhase: 'partner-selection',
          attemptingPartyIndex: 0,
          coalitionLog: []
        }
      };

    case 'CONTINUE_CAMPAIGN': {
      // Determine the incumbent government: if coalition is complete, it's the coalition partners, otherwise the single winner
      let governmentParties: string[] = [];
      const isCoalition = state.coalitionState?.negotiationPhase === 'complete';
      let newGovCandidates: Candidate[] = [];

      if (isCoalition && state.coalitionState) {
        newGovCandidates = state.coalitionState.coalitionPartners;
        governmentParties = newGovCandidates.map(p => p.party);
      } else if (state.pollResults.length > 0) {
        // Find single winner
        const winner = [...state.pollResults].sort((a, b) => b.percentage - a.percentage)[0];
        newGovCandidates = [winner.candidate];
        governmentParties = [winner.candidate.party];
      }

      const currentPollResults = state.pollResults;
      const initialPolls: Record<string, number> = {};
      currentPollResults.forEach(r => {
        initialPolls[r.candidate.party] = r.percentage;
      });

      // Generate Government Formation News
      const govNews: string[] = [];
      if (newGovCandidates.length > 0) {
        const pollResultMap: Record<string, number> = {};
        currentPollResults.forEach(r => pollResultMap[r.candidate.party] = r.percentage);

        const coalitionValues = calculateWeightedIdeology(newGovCandidates, pollResultMap);

        const descriptors = getIdeologyDescriptors(coalitionValues);
        // Descriptors are sorted by most prominent magnitude first
        let govDescriptor = "centrist";
        if (descriptors.length >= 3 && descriptors[0].desc && Math.random() < 0.7) {
          govDescriptor = descriptors[0].desc + ", " + descriptors[1].desc;
        } else if (descriptors.length >= 2 && descriptors[1].desc && Math.random() < 0.3) {
          govDescriptor = descriptors[1].desc;
        }
        else if (descriptors.length > 0 && descriptors[0].desc) {
          govDescriptor = descriptors[0].desc;
        }

        const previousGov = state.incumbentGovernment;
        const newLeadParty = newGovCandidates[0].party;
        const govType = isCoalition ? "coalition government" : "government";
        let headline = "";
        if (previousGov && previousGov.length > 0) {
          if (previousGov[0] !== newLeadParty) {
            const changeTemplates = [
              `BREAKING: ${previousGov[0]} government falls, ${newLeadParty} forms new ${govDescriptor} ${govType}`,
              `BREAKING: ${newLeadParty} ousts ${previousGov[0]} to form new ${govDescriptor} ${govType}`,
              `BREAKING: Power shift as ${newLeadParty} replaces ${previousGov[0]} administration with new ${govDescriptor} ${govType}.`,
              `BREAKING: ${newLeadParty} takes control from ${previousGov[0]} in new ${govDescriptor} ${govType}`
            ];
            headline = changeTemplates[Math.floor(Math.random() * changeTemplates.length)];
          } else {
            const continueTemplates = [
              `BREAKING: ${newLeadParty}'s ${govDescriptor} ${govType} survives election`,
              `BREAKING: ${newLeadParty} secures another term in power with ${govDescriptor} administration`,
              `BREAKING: ${newLeadParty} retains control with ${govDescriptor} ${govType}`,
              `BREAKING: ${newLeadParty} continues to govern with ${govDescriptor} ${govType}`
            ];
            headline = continueTemplates[Math.floor(Math.random() * continueTemplates.length)];
          }
        } else {
          const initialTemplates = [
            `BREAKING: ${newLeadParty} forms new ${govDescriptor} ${govType}`,
            `BREAKING: ${newLeadParty} takes office to lead new ${govDescriptor} administration`,
            `BREAKING: New era begins as ${newLeadParty} forms ${govDescriptor} ${govType}`,
            `BREAKING: ${newLeadParty} successfully forms ${govDescriptor} ${govType}`
          ];
          headline = initialTemplates[Math.floor(Math.random() * initialTemplates.length)];
        }

        govNews.push(headline);
      }

      return {
        ...state,
        phase: 'campaign',
        incumbentGovernment: governmentParties,
        currentPoll: 0,
        pollResults: [],
        pollingHistory: [],
        initialPollResults: initialPolls,
        previousPollResults: initialPolls,
        politicalNews: govNews,
        playerEventNews: [],
        activeTrend: state.activeTrend,
        trendHistory: state.trendHistory,
        nextTrendPoll: state.nextTrendPoll !== null ? Math.max(1, state.nextTrendPoll - state.totalPolls) : null,
        coalitionState: undefined,
        blocStatsHistory: [],
        postElectionStats: undefined,
        blocStats: state.blocStats, // Keep the final bloc stats as the new baseline
        previousBlocStats: state.blocStats,
        initialBlocStats: state.blocStats,
        // The below properties are cleared on a new campaign
        eventVariables: state.eventVariables, // Keep custom event variable logic
        targetedBlocId: state.targetedBlocId,
        targetingStartWeek: state.targetingStartWeek != null ? state.targetingStartWeek - state.totalPolls : null,
        targetingWeeksActive: state.targetingWeeksActive ?? 0,
      };
    }

    case 'LOAD_STATE': {
      return {
        ...action.payload.savedState
      };
    }

    case 'NEXT_COALITION_ATTEMPT': {
      if (!state.coalitionState) return state;
      const sortedResultsForAttempt = [...state.pollResults].sort((a, b) => b.percentage - a.percentage);
      const nextAttemptIndex = state.coalitionState.attemptingPartyIndex + 1;
      const prevLeaderName = state.coalitionState.coalitionPartners[0]?.party ?? 'First party';
      // Only allow up to third-largest party (index 2), then pass back to first party (index 3)
      if (nextAttemptIndex === 3) {
        // Pass back to the first party, allowing them to try again. If they fail, they form a minority government.
        const exhaustMsg = `${prevLeaderName} and all other parties failed to reach a majority. The mandate returns to ${sortedResultsForAttempt[0].candidate.party} for a final attempt.`;
        const nextLeader = sortedResultsForAttempt[0].candidate;
        const nextLeaderPercentage = sortedResultsForAttempt[0].percentage;
        const nextAvailablePartners = sortedResultsForAttempt
          .filter(r => r.candidate.id !== nextLeader.id)
          .map(r => r.candidate);
        const nextPartnersWithCompatibility = nextAvailablePartners.map(partner => ({
          ...partner,
          compatibility: calculatePartyCompatibility(nextLeader, partner)
        })).sort((a, b) => b.compatibility - a.compatibility);

        return {
          ...state,
          coalitionState: {
            ...state.coalitionState,
            coalitionPartners: [nextLeader],
            currentCoalitionPercentage: nextLeaderPercentage,
            availablePartners: nextPartnersWithCompatibility,
            cabinetAllocations: {}, // Clear allocations for the retried attempt
            isPlayerLead: nextLeader.is_player,
            negotiationPhase: 'partner-selection',
            attemptingPartyIndex: nextAttemptIndex,
            coalitionLog: [...state.coalitionState.coalitionLog, exhaustMsg]
          }
        };
      } else if (nextAttemptIndex > 3 || nextAttemptIndex >= sortedResultsForAttempt.length) {
        // Fallback for safety
        const exhaustMsg = `A minority government will be formed by ${sortedResultsForAttempt[0].candidate.party}.`;
        return {
          ...state,
          coalitionState: {
            ...state.coalitionState,
            coalitionPartners: [sortedResultsForAttempt[0].candidate],
            currentCoalitionPercentage: sortedResultsForAttempt[0].percentage,
            negotiationPhase: 'complete',
            coalitionLog: [...state.coalitionState.coalitionLog, exhaustMsg]
          }
        };
      }
      const nextLeader = sortedResultsForAttempt[nextAttemptIndex].candidate;
      const nextLeaderPercentage = sortedResultsForAttempt[nextAttemptIndex].percentage;
      const nextAvailablePartners = sortedResultsForAttempt
        .filter((_, i) => i !== nextAttemptIndex)
        .map(r => r.candidate)
        .filter(c => c.id !== nextLeader.id);
      const nextPartnersWithCompatibility = nextAvailablePartners.map(partner => ({
        ...partner,
        compatibility: calculatePartyCompatibility(nextLeader, partner)
      })).sort((a, b) => b.compatibility - a.compatibility);
      const mandateMsg = `${prevLeaderName} failed to secure a majority. The mandate now passes to ${nextLeader.party}.`;
      return {
        ...state,
        coalitionState: {
          coalitionPartners: [nextLeader],
          currentCoalitionPercentage: nextLeaderPercentage,
          availablePartners: nextPartnersWithCompatibility,
          cabinetAllocations: {},
          isPlayerLead: nextLeader.is_player,
          negotiationPhase: 'partner-selection',
          attemptingPartyIndex: nextAttemptIndex,
          coalitionLog: [...state.coalitionState.coalitionLog, mandateMsg]
        }
      };
    }

    case 'ADD_COALITION_PARTNER': {
      if (!state.coalitionState) return state;

      const partnerResult = state.pollResults.find(r => r.candidate.id === action.payload.partner.id);
      const partnerPercentage = partnerResult ? partnerResult.percentage : 0;
      const newTotalPercentage = state.coalitionState.currentCoalitionPercentage + partnerPercentage;

      const nextCabinetAllocations = { ...state.coalitionState.cabinetAllocations };

      // Add offered positions if any
      if (action.payload.positions) {
        action.payload.positions.forEach(pos => {
          if (!nextCabinetAllocations[pos]) {
            nextCabinetAllocations[pos] = [];
          }
          nextCabinetAllocations[pos].push(action.payload.partner.party);
        });
      }

      const isNowComplete = newTotalPercentage >= 50;
      if (isNowComplete) {
        const leadPartyId = state.coalitionState.coalitionPartners[0]?.party;
        if (leadPartyId) {
          autoAllocateUnfilledCabinetPositions(nextCabinetAllocations, leadPartyId);
        }
      }

      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          coalitionPartners: [...state.coalitionState.coalitionPartners, action.payload.partner],
          currentCoalitionPercentage: newTotalPercentage,
          availablePartners: state.coalitionState.availablePartners.filter(p => p.id !== action.payload.partner.id),
          cabinetAllocations: nextCabinetAllocations,
          // If we reach 50%+, mark as complete instead of cabinet-negotiation
          negotiationPhase: isNowComplete ? 'complete' : 'partner-selection'
        }
      };
    }

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

    case 'COMPLETE_COALITION_FORMATION': {
      if (!state.coalitionState) return state;
      const currentAllocations = { ...state.coalitionState.cabinetAllocations };
      const leadPartyId = state.coalitionState.coalitionPartners[0]?.party;
      if (leadPartyId) {
        autoAllocateUnfilledCabinetPositions(currentAllocations, leadPartyId);
      }
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          cabinetAllocations: currentAllocations,
          negotiationPhase: 'complete'
        }
      };
    }

    case 'LOG_COALITION_EVENT':
      if (!state.coalitionState) return state;
      return {
        ...state,
        coalitionState: {
          ...state.coalitionState,
          coalitionLog: [...state.coalitionState.coalitionLog, action.payload.message]
        }
      };

    case 'SET_EVENT_VARIABLES':
      return {
        ...state,
        eventVariables: action.payload.eventVariables
      };

    case 'SET_TARGETED_BLOC':
      // If explicitly untargeting (null), clear state
      if (action.payload.blocId === null) {
        return {
          ...state,
          targetedBlocId: null,
          targetingStartWeek: null,
          targetingWeeksActive: 0
        };
      }

      // Start (or switch to) targeting — reset the weeks counter
      return {
        ...state,
        targetedBlocId: action.payload.blocId,
        targetingStartWeek: state.currentPoll,
        targetingWeeksActive: 0
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

    addCoalitionPartner: useCallback((partner: Candidate, positions?: string[]) => {
      dispatch({ type: 'ADD_COALITION_PARTNER', payload: { partner, positions } });
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
    }, []),

    nextCoalitionAttempt: useCallback(() => {
      dispatch({ type: 'NEXT_COALITION_ATTEMPT' });
    }, []),

    continueCampaign: useCallback(() => {
      dispatch({ type: 'CONTINUE_CAMPAIGN' });
    }, []),

    loadState: useCallback((savedState: any) => {
      dispatch({ type: 'LOAD_STATE', payload: { savedState } });
    }, []),

    logCoalitionEvent: useCallback((message: string) => {
      dispatch({ type: 'LOG_COALITION_EVENT', payload: { message } });
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
