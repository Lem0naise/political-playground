'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { GameState, Candidate, PollResult, Event, EventChoice } from '@/types/game';
import { 
  generateVotingData, 
  conductPoll, 
  applyEventEffect, 
  createCandidate 
} from '@/lib/gameEngine';

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
  };
}

type GameAction = 
  | { type: 'SET_COUNTRY'; payload: { country: string; countryData: any } }
  | { type: 'SET_PARTY_LIST'; payload: { partyList: string; parties: any[] } }
  | { type: 'SET_PLAYER_CANDIDATE'; payload: { candidateId: number } }
  | { type: 'START_CAMPAIGN' }
  | { type: 'NEXT_POLL' }
  | { type: 'HANDLE_EVENT'; payload: { event: Event; choice: EventChoice } }
  | { type: 'RESET_GAME' };

const initialState: GameState = {
  country: '',
  countryData: { pop: 0, vals: { prog_cons: 0, nat_glob: 0, env_eco: 0, soc_cap: 0, pac_mil: 0, auth_ana: 0, rel_sec: 0 }, scale: 1, hos: '' },
  partyList: '',
  candidates: [],
  playerCandidate: null,
  currentPoll: 0,
  totalPolls: 52,
  pollResults: [],
  previousPollResults: {},
  initialPollResults: {},
  politicalNews: [],
  playerEventNews: [],
  votingData: [],
  phase: 'setup'
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_COUNTRY':
      return {
        ...state,
        country: action.payload.country,
        countryData: action.payload.countryData,
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
        politicalNews: ["Campaign season officially begins as parties establish their platforms."]
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
      
      return {
        ...state,
        currentPoll: nextPollNum,
        pollResults: resultsWithChange,
        previousPollResults: newPreviousResults,
        politicalNews: [...state.playerEventNews, ...newsEvents],
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
