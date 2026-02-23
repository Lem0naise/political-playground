import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { GameState, Candidate, PollResult, Event, EventChoice, CoalitionState, PollingSnapshot, PoliticalValues, TARGET_SHIFT, BlocStatistics, PostElectionStats, BlocSwingData, PartyBlocSupport, VoterTransferEntry, VALUES } from '@/types/game';
import {
  generateVotingData,
  conductPoll,
  applyEventEffect,
  createCandidate,
  createTrend,
  applyTrendStep,
  formatTrendStartHeadline,
  scheduleNextTrendPoll,
  snapshotInitialChoices,
  getVoterTransferMatrix
} from '@/lib/gameEngine';
import { calculatePartyCompatibility, autoAllocateUnfilledCabinetPositions } from '@/lib/coalitionEngine';
import { instantiateEvent, loadEventVariables, EventVariables } from '@/lib/eventTemplates';
import { getIdeologyDescriptors, calculateWeightedIdeology } from '@/lib/ideologyProfiler';

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
    addCoalitionPartner: (partner: Candidate) => void;
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
  | { type: 'ADD_COALITION_PARTNER'; payload: { partner: Candidate } }
  | { type: 'REMOVE_POTENTIAL_PARTNER'; payload: { partner: Candidate } }
  | { type: 'ALLOCATE_CABINET_POSITION'; payload: { position: string; party: string } }
  | { type: 'COMPLETE_COALITION_FORMATION' }
  | { type: 'SET_EVENT_VARIABLES'; payload: { eventVariables: EventVariables } }
  | { type: 'SET_TARGETED_BLOC'; payload: { blocId: string | null } }
  | { type: 'NEXT_COALITION_ATTEMPT' }
  | { type: 'CONTINUE_CAMPAIGN' }
  | { type: 'LOAD_STATE'; payload: { savedState: any } }
  | { type: 'LOG_COALITION_EVENT'; payload: { message: string } };

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

  // If we have event variables, resolve the remaining placeholders
  if (eventVars) {
    text = text.replace(/\{(\w+)\}/g, (match, key) => {
      // It might be an explicit var that was missed, or already replaced but matched again if the replacement had braces (unlikely)
      if (vars[key] !== undefined) return vars[key];
      if (key === 'country') return country;

      const countryVars = eventVars.countrySpecific?.[country];
      const hasCountry = countryVars && countryVars[key] && countryVars[key].length > 0;
      const hasGeneric = eventVars.generic?.[key] && eventVars.generic[key].length > 0;

      // 90% chance to use country-specific if available
      if (hasCountry && Math.random() < 0.9) {
        return countryVars[key][Math.floor(Math.random() * countryVars[key].length)];
      }

      // Fallback to country-specific if no generic, or use generic
      if (hasCountry && !hasGeneric) {
        return countryVars[key][Math.floor(Math.random() * countryVars[key].length)];
      }

      if (hasGeneric) {
        return eventVars.generic[key][Math.floor(Math.random() * eventVars.generic[key].length)];
      }

      // If neither exists, leave the placeholder intact
      return match;
    });
  }

  return text;
}

// Calculate post-election statistics
function calculatePostElectionStats(
  finalResults: PollResult[],
  initialPollResults: Record<string, number>,
  initialBlocStats: BlocStatistics[] | undefined,
  finalBlocStats: BlocStatistics[] | undefined,
  blocStatsHistory: BlocStatistics[][] | undefined
): PostElectionStats {
  // Calculate party swings
  const partySwings = finalResults.map(result => ({
    party: result.candidate.party,
    initialPercentage: initialPollResults[result.candidate.party] || 0,
    finalPercentage: result.percentage,
    swing: result.percentage - (initialPollResults[result.candidate.party] || 0)
  })).sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));

  // Calculate bloc swings (biggest swing for each bloc across all parties)
  const blocSwings: BlocSwingData[] = [];
  if (initialBlocStats && finalBlocStats) {
    finalBlocStats.forEach(finalBloc => {
      const initialBloc = initialBlocStats.find(b => b.blocId === finalBloc.blocId);
      if (!initialBloc) return;

      // Find the party with the biggest swing in this bloc
      let biggestSwing = 0;
      let biggestSwingParty = '';
      let initialPct = 0;
      let finalPct = 0;

      Object.keys(finalBloc.percentages).forEach(party => {
        const final = finalBloc.percentages[party] || 0;
        const initial = initialBloc.percentages[party] || 0;
        const swing = final - initial;

        if (Math.abs(swing) > Math.abs(biggestSwing)) {
          biggestSwing = swing;
          biggestSwingParty = party;
          initialPct = initial;
          finalPct = final;
        }
      });

      if (biggestSwingParty) {
        blocSwings.push({
          blocId: finalBloc.blocId,
          blocName: finalBloc.blocName,
          party: biggestSwingParty,
          initialPercentage: initialPct,
          finalPercentage: finalPct,
          swing: biggestSwing
        });
      }
    });
  }

  // Sort bloc swings by absolute swing magnitude
  blocSwings.sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));

  // Calculate party bloc support (strongest and weakest blocs for each party)
  const partyBlocSupport: PartyBlocSupport[] = [];
  if (finalBlocStats) {
    const parties = new Set(finalResults.map(r => r.candidate.party));

    parties.forEach(party => {
      let strongestBloc = '';
      let strongestBlocName = '';
      let strongestPct = -1;
      let weakestBloc = '';
      let weakestBlocName = '';
      let weakestPct = 101;

      finalBlocStats.forEach(bloc => {
        const pct = bloc.percentages[party] || 0;
        if (pct > strongestPct) {
          strongestPct = pct;
          strongestBloc = bloc.blocId;
          strongestBlocName = bloc.blocName;
        }
        if (pct < weakestPct && pct > 0) {
          weakestPct = pct;
          weakestBloc = bloc.blocId;
          weakestBlocName = bloc.blocName;
        }
      });

      if (strongestBloc && weakestBloc) {
        partyBlocSupport.push({
          party,
          strongestBloc,
          strongestBlocName,
          strongestBlocPercentage: strongestPct,
          weakestBloc,
          weakestBlocName,
          weakestBlocPercentage: weakestPct
        });
      }
    });
  }

  // Calculate turnout changes
  let biggestTurnoutIncrease: PostElectionStats['biggestTurnoutIncrease'];
  let biggestTurnoutDecrease: PostElectionStats['biggestTurnoutDecrease'];

  if (initialBlocStats && finalBlocStats) {
    let maxIncrease = 0;
    let maxDecrease = 0;

    finalBlocStats.forEach(finalBloc => {
      const initialBloc = initialBlocStats.find(b => b.blocId === finalBloc.blocId);
      if (!initialBloc) return;

      const change = finalBloc.turnout - initialBloc.turnout;

      if (change > maxIncrease) {
        maxIncrease = change;
        biggestTurnoutIncrease = {
          blocId: finalBloc.blocId,
          blocName: finalBloc.blocName,
          initialTurnout: initialBloc.turnout,
          finalTurnout: finalBloc.turnout,
          increase: change
        };
      }

      if (change < maxDecrease) {
        maxDecrease = change;
        biggestTurnoutDecrease = {
          blocId: finalBloc.blocId,
          blocName: finalBloc.blocName,
          initialTurnout: initialBloc.turnout,
          finalTurnout: finalBloc.turnout,
          decrease: Math.abs(change)
        };
      }
    });
  }

  return {
    partySwings,
    blocSwings,
    partyBlocSupport,
    biggestTurnoutIncrease,
    biggestTurnoutDecrease
  };
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
  targetingCooldownUntil: null,
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

      const nextState = {
        ...state,
        votingData,
        pollResults: results,
        initialPollResults: initialResults,
        previousPollResults: initialResults,
        currentPoll: 1,
        politicalNews: ["ELECTION SEASON OFFICIALLY BEGINS."],
        pollingHistory: [initialPollingSnapshot],
        activeTrend: null,
        trendHistory: [],
        nextTrendPoll: scheduleNextTrendPoll(1),
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

      const nextPollNum = state.currentPoll + 1;
      const globalTrendNews: string[] = []; // Changed from trendNews to avoid conflict with party trends
      let activeTrend = state.activeTrend;
      let trendHistory = state.trendHistory;
      let nextTrendPoll = state.nextTrendPoll;
      let updatedCountryValues = state.countryData.vals;
      const votingDataRef = state.votingData;

      if (!activeTrend && nextTrendPoll !== null && nextPollNum >= nextTrendPoll && nextPollNum < state.totalPolls) {
        const previousKey = trendHistory.length > 0 ? trendHistory[trendHistory.length - 1].valueKey : undefined;
        const newTrend = createTrend(nextPollNum, previousKey);
        globalTrendNews.push(formatTrendStartHeadline(newTrend));
        const stepResult = applyTrendStep(newTrend, updatedCountryValues, votingDataRef);
        updatedCountryValues = stepResult.values;
        if (stepResult.ongoingNews) {
          globalTrendNews.push(stepResult.ongoingNews);
        }
        if (stepResult.completionNews) {
          globalTrendNews.push(stepResult.completionNews);
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
          globalTrendNews.push(stepResult.ongoingNews);
        }
        if (stepResult.completionNews) {
          globalTrendNews.push(stepResult.completionNews);
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
              const shift = difference * TARGET_SHIFT; // 2% of the difference
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

        const newsTitle = (Math.random() < 0.7 ? result.candidate.party : result.candidate.name)

        let newsProbability = 0.05;
        newsProbability += (result.percentage / 100) * 1.5;
        if (Math.abs(result.change) > 2.5) {
          newsProbability += 0.8;
        } else if (Math.abs(result.change) > 1.0) {
          newsProbability += 0.3;
        }

        if (Math.random() < newsProbability || (result.candidate === state.playerCandidate)) {
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


      });
      // --- END: Add news for all parties with polling surges/drops ---

      // --- BEGIN: Add Overtake News ---
      const sortedCurrentResults = [...newResults].sort((a, b) => b.percentage - a.percentage);
      for (let i = 0; i < sortedCurrentResults.length - 1; i++) {
        const partyA = sortedCurrentResults[i];
        const partyB = sortedCurrentResults[i + 1];

        // If both parties are > 10%
        if (partyA.percentage >= 10 && partyB.percentage >= 10) {
          const prevPctA = state.previousPollResults[partyA.candidate.party] || 0;
          const prevPctB = state.previousPollResults[partyB.candidate.party] || 0;

          // partyA is current above partyB. Did partyA overtake partyB?
          // Meaning previously, prevPctA was less than prevPctB.
          if (prevPctA < prevPctB) {
            // High chance to generate news
            if (Math.random() < 0.6) {
              const templates = [
                `{partyA} surges above {partyB} in latest polls`,
                `{partyA} overtakes {partyB} in shock polling shift`,
                `New polls show {partyA} passing {partyB}`,
                `{partyB} loses ground, slips behind {partyA}`
              ];
              const template = templates[Math.floor(Math.random() * templates.length)];
              let headline = template.replace(/\{partyA\}/g, partyA.candidate.party)
                .replace(/\{partyB\}/g, partyB.candidate.party);
              partyPollingNews.push(headline);
            }
          }
        }
      }
      // --- END: Add Overtake News ---

      // --- BEGIN: Party Polling Trends (Gaffes / Positive Events) ---
      const trendNews: string[] = [];
      const ONGOING_SCANDAL_TEMPLATES = [
        `Fallout continues from {topic} scandal for {candidate_name}`,
        `{party} still struggling to control narrative around {topic}`,
        `Voters haven't forgotten the {topic} controversy surrounding {leader_name}`,
        `{topic} continues to plague {party}'s polling numbers`,
        `Analysts point to {topic} as cause for {candidate_name}'s ongoing slump`
      ];

      const ONGOING_BOOST_TEMPLATES = [
        `{candidate_name} continues to ride the wave from {topic}`,
        `{party}'s momentum holds strong following {topic}`,
        `{leader_name}'s {topic} success continues to resonate with voters`,
        `Approval ratings for {party} still benefiting from {topic}`,
        `{candidate_name} capitalizes on ongoing enthusiasm for {topic}`
      ];

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

      // We process ALL candidates (including player)
      state.candidates.forEach(candidate => {
        // Find the mutable state counterpart reference because state.candidates might have been cloned or we are mutating it directly in conductPoll?
        // Wait, NEXT_POLL reducer in GameContext isn't mutating candidate directly like applyPoliticalDynamics did, but state.candidates are objects that are mutated inside applyPoliticalDynamics anyway. We should mutate candidate.

        // 1) Evaluate if they have an active PartyTrend
        if (candidate.trend && candidate.trend.weeksRemaining > 0) {
          candidate.trend.weeksRemaining -= 1;

          // Apply polling impact
          candidate.party_pop = Math.max(-50, Math.min(100, candidate.party_pop + candidate.trend.weeklyEffect));

          // Every week of a trend has a 40% chance of generating a follow-up news story
          if (Math.random() < 0.4) {
            const templates = candidate.trend.type === 'scandal' ? ONGOING_SCANDAL_TEMPLATES : ONGOING_BOOST_TEMPLATES;
            const template = templates[Math.floor(Math.random() * templates.length)];
            const useLeaderName = Math.random() < 0.5;
            const newsText = substituteNewsVariables(
              template,
              {
                candidate_name: candidate.name,
                party: candidate.party,
                leader_name: useLeaderName ? candidate.name : candidate.party,
                topic: candidate.trend.topic
              },
              state.eventVariables,
              state.country
            );
            trendNews.push(newsText);
          }

          // Clear if finished
          if (candidate.trend.weeksRemaining <= 0) {
            candidate.trend = undefined;
          }
        } else {
          // 2) If no active trend, there is a chance to spawn a new one
          const candidateResult = resultsWithChange.find(r => r.candidate.id === candidate.id);
          const currentPolling = candidateResult ? candidateResult.percentage : 0;
          const currentSwing = candidateResult ? candidateResult.change : 0;

          if (Math.abs(currentSwing) < 0.3) {
            return; // Only show events if there is a polling shift to explain it
          }

          let eventProbability = 0.04;
          eventProbability += (currentPolling / 100) * 0.4;
          if (Math.abs(currentSwing) > 2.0) eventProbability += 0.2;

          if (Math.random() < eventProbability) {
            const isGaffe = currentSwing < 0;
            const templates = isGaffe ? GAFFE_TEMPLATES : POSITIVE_TEMPLATES;
            const template = templates[Math.floor(Math.random() * templates.length)];
            const useLeaderName = Math.random() < 0.5;

            const rawHeadline = substituteNewsVariables(
              template,
              {
                candidate_name: candidate.name,
                party: candidate.party,
                leader_name: useLeaderName ? candidate.name : candidate.party
              },
              state.eventVariables,
              state.country
            );

            // Announce the outbreak of the trend
            trendNews.push(`BREAKING: ${rawHeadline}`);

            // Derive a "topic" from the headline (first 5 words) to reference later.
            const topic = rawHeadline.split(' ').slice(0, 5).join(' ') + '...';

            candidate.trend = {
              type: isGaffe ? 'scandal' : 'boost',
              duration: 2 + Math.floor(Math.random() * 3), // 2 to 4 weeks
              weeksRemaining: 2 + Math.floor(Math.random() * 3),
              weeklyEffect: isGaffe ? -(1 + Math.random() * 1.5) : (0.5 + Math.random() * 1.0),
              topic: topic
            };

            // Apply first week's effect immediately
            candidate.trend.weeksRemaining -= 1;
            candidate.party_pop = Math.max(-50, Math.min(100, candidate.party_pop + candidate.trend.weeklyEffect));
          }
        }
      });
      // --- END: Party Polling Trends (Gaffes / Positive Events) ---

      // --- BEGIN: Random position shifts for non-player parties ---
      const positionShiftNews: string[] = [];

      const POSITION_SHIFT_TEMPLATES: Record<string, { positive: string[]; negative: string[] }> = {
        prog_cons: {
          positive: [
            `{party} embraces progressive values on social issues`,
            `{leader_name} shifts party platform to the left`,
            `{party} adopts progressive stance in critical debate`,
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
            `{party} adopts capitalist approach to {industry}`,
            `{candidate_name} announces free-market reforms`
          ],
          negative: [
            `{party} pivots toward socialist economic policies`,
            `{leader_name} champions wealth redistribution`,
            `{party} embraces state intervention in {industry}`,
            `{candidate_name} adopts democratic socialist platform`
          ]
        },
        pac_mil: {
          positive: [
            `{party} embraces strong national defense policy`,
            `{leader_name} champions military modernization`,
            `{party} shifts toward hawkish foreign policy`,
            `{candidate_name} announces security-first platform`
          ],
          negative: [
            `{party} pivots toward pacifist foreign policy`,
            `{leader_name} champions diplomatic solutions`,
            `{party} shifts away from military spending`,
            `{candidate_name} adopts anti-war stance`
          ]
        },
        auth_ana: {
          positive: [
            `{party} embraces civil libertarian platform`,
            `{leader_name} champions individual freedoms`,
            `{party} shifts toward decentralized governance`,
            `{candidate_name} announces freedom-first policy`
          ],
          negative: [
            `{party} pivots toward authoritarian "law and order"`,
            `{leader_name} shifts party toward strong-state policies`,
            `{party} embraces centralized authority`,
            `{candidate_name} adopts strict security platform`
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

      const nonPlayerCandidates = state.candidates.filter(c => !c.is_player);
      nonPlayerCandidates.forEach(candidate => {
        const candidateResult = resultsWithChange.find(r => r.candidate.id === candidate.id);
        const currentPolling = candidateResult ? candidateResult.percentage : 0;
        const currentSwing = candidateResult ? candidateResult.change : 0;

        let shiftProbability = 0.05;
        shiftProbability += (currentPolling / 100) * 0.3;
        if (Math.abs(currentSwing) > 2.0) shiftProbability += 0.15;

        // chance per party per poll for a position shift
        if (Math.random() < shiftProbability) {
          // Pick a random axis to shift
          const axes: (keyof PoliticalValues)[] = ['prog_cons', 'nat_glob', 'env_eco', 'soc_cap', 'pac_mil', 'auth_ana', 'rel_sec'];
          const axisToShift = axes[Math.floor(Math.random() * axes.length)];

          // Shift amount: 5-10 points (similar to player events)
          const shiftAmount = (10 + Math.random() * 10) * (Math.random() < 0.5 ? 1 : -1);

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
        ...globalTrendNews, // Note: renamed the earlier trendNews to globalTrendNews to prevent variable name conflict
        ...state.playerEventNews,
        ...newsEvents,
        ...partyPollingNews,
        ...trendNews, // the new party-specific trend news
        ...positionShiftNews
      ];

      // Sort the combined array by word count in ascending order.
      const sortedPoliticalNews = allNewsItems.sort((a, b) => {
        if (Math.random() < 0.6) {
          return (a.split(' ').length - b.split(' ').length);
        }
        else { return 1; }

      });

      // Calculate post-election stats if this is the final poll
      let postElectionStats: PostElectionStats | undefined = undefined;
      if (nextPollNum >= state.totalPolls) {
        // Compute voter transfers from initial poll to final poll
        const candidateNames = state.candidates.map(c => c.party);
        const rawTransfers = getVoterTransferMatrix(candidateNames);
        // Keep all transfers ≥1% of the from-party's own voters (includes Not Voting on both sides)
        const significantTransfers = rawTransfers.filter(
          t => t.percentage >= 1.0
        );
        postElectionStats = calculatePostElectionStats(
          resultsWithChange,
          state.initialPollResults,
          state.initialBlocStats,
          newBlocStats,
          state.blocStatsHistory
        );
        if (postElectionStats) {
          postElectionStats.voterTransfers = significantTransfers;
        }
      }

      // Add current bloc stats to history
      const updatedBlocStatsHistory = [...(state.blocStatsHistory || [])];
      if (newBlocStats) {
        updatedBlocStatsHistory.push(newBlocStats);
      }

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
        blocStatsHistory: updatedBlocStatsHistory,
        postElectionStats,
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
        activeTrend: null,
        trendHistory: [],
        nextTrendPoll: null,
        coalitionState: undefined,
        blocStatsHistory: [],
        postElectionStats: undefined,
        blocStats: state.blocStats, // Keep the final bloc stats as the new baseline
        previousBlocStats: state.blocStats,
        initialBlocStats: state.blocStats,
        // The below properties are cleared on a new campaign
        eventVariables: state.eventVariables, // Keep custom event variable logic
        targetedBlocId: null,
        targetingStartWeek: null,
        targetingCooldownUntil: null,
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
