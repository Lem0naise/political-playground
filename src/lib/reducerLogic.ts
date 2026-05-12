import { GameState, PoliticalValues, PostElectionStats, BlocSwingData, PartyBlocSupport, NewsItem } from '@/types/game';
import { EventVariables } from '@/lib/eventTemplates';
import {
  applyTrendStep,
  conductPoll,
  createTrend,
  formatTrendStartHeadline,
  scheduleNextTrendPoll,
  getVoterTransferMatrix,
  MAX_ACTIVE_TRENDS,
  BlocStatistics,
  checkForLeadershipChanges,
  checkForPartyDissolution,
  checkForNewPartyFormation,
  checkForPartySplit,
  checkForPartyMerger
} from '@/lib/gameEngine';
import {
  SURGE_MESSAGES,
  LOSE_MESSAGES,
  STEADY_MESSAGES,
  MIXED_MESSAGES,
  OVERTAKE_TEMPLATES,
  ONGOING_SCANDAL_TEMPLATES,
  ONGOING_BOOST_TEMPLATES,
  GAFFE_TEMPLATES,
  POSITIVE_TEMPLATES,
  POSITION_SHIFT_TEMPLATES,
  IDEOLOGY_DRIFT_ONGOING_TEMPLATES,
  IDEOLOGY_DRIFT_COMPLETE_TEMPLATES,
  GOVERNMENT_SURGE_TEMPLATES,
  GOVERNMENT_LOSE_TEMPLATES,
  OPPOSITION_SURGE_TEMPLATES,
  OPPOSITION_LOSE_TEMPLATES
} from '@/lib/newsTemplates';

const AXIS_KEYS: (keyof PoliticalValues)[] = ['prog_cons', 'nat_glob', 'env_eco', 'soc_cap', 'pac_mil', 'auth_ana', 'rel_sec'];

// Helper function to substitute variables in news templates
export function substituteNewsVariables(
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

      // Use country-specific if available
      if (hasCountry) {
        return countryVars[key][Math.floor(Math.random() * countryVars[key].length)];
      }
      // Use generic if available
      else if (hasGeneric) {
        return eventVars.generic[key][Math.floor(Math.random() * eventVars.generic[key].length)];
      }

      // If neither exists, leave the placeholder intact
      return match;
    });
  }

  return text;
}

// Calculate post-election statistics
export function calculatePostElectionStats(
  finalResults: any[],
  initialPollResults: Record<string, number>,
  initialBlocStats: BlocStatistics[] | undefined,
  finalBlocStats: BlocStatistics[] | undefined
): PostElectionStats {
  // Calculate party swings
  const partySwings = finalResults.map(result => {
    const initialPercentage = initialPollResults[result.candidate.party] || 0;
    return {
      party: result.candidate.party,
      initialPercentage,
      finalPercentage: result.percentage,
      swing: result.percentage - initialPercentage
    };
  }).sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));

  // Calculate bloc swings (biggest swing for each bloc across all parties)
  const blocSwings: BlocSwingData[] = [];
  if (initialBlocStats && finalBlocStats) {
    const initialBlocById = new Map(initialBlocStats.map(bloc => [bloc.blocId, bloc]));
    finalBlocStats.forEach(finalBloc => {
      const initialBloc = initialBlocById.get(finalBloc.blocId);
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
    const initialBlocById = new Map(initialBlocStats.map(bloc => [bloc.blocId, bloc]));
    let maxIncrease = 0;
    let maxDecrease = 0;

    finalBlocStats.forEach(finalBloc => {
      const initialBloc = initialBlocById.get(finalBloc.blocId);
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

export function calculateNextPollState(state: GameState): GameState {
  const nextPollNum = state.currentPoll + 1;
  const globalTrendNews: string[] = [];
  let activeTrends = state.activeTrend;
  let trendHistory = state.trendHistory;
  let nextTrendPoll = state.nextTrendPoll;
  let updatedCountryValues = state.countryData.vals;
  let updatedBlocs = state.countryData.blocs;
  const votingDataRef = state.votingData;
  let finalIncumbentGovernment: string[] = state.incumbentGovernment ?? [];

  // Step each active trend; collect completed ones
  const stillActiveTrends: typeof activeTrends = [];
  for (const trend of activeTrends) {
    const stepResult = applyTrendStep(trend, updatedCountryValues, votingDataRef, updatedBlocs);
    updatedCountryValues = stepResult.values;
    if (stepResult.blocs) updatedBlocs = stepResult.blocs;
    if (stepResult.ongoingNews) globalTrendNews.push(stepResult.ongoingNews);
    if (stepResult.completionNews) globalTrendNews.push(stepResult.completionNews);
    if (stepResult.completedTrend) {
      trendHistory = [...trendHistory, stepResult.completedTrend];
    } else if (stepResult.trend) {
      stillActiveTrends.push(stepResult.trend);
    }
  }
  activeTrends = stillActiveTrends;

  // Maybe spawn a new trend (if the poll timer has triggered and cap not reached)
  if (nextTrendPoll !== null && nextPollNum >= nextTrendPoll && nextPollNum < state.totalPolls) {
    if (activeTrends.length < MAX_ACTIVE_TRENDS) {
      // Exclude axes already covered by active trends
      const activeKeys = activeTrends.map(t => t.valueKey);
      const newTrend = createTrend(nextPollNum, activeKeys.length > 0 ? activeKeys : undefined);
      globalTrendNews.push(formatTrendStartHeadline(newTrend));
      const stepResult = applyTrendStep(newTrend, updatedCountryValues, votingDataRef, updatedBlocs);
      updatedCountryValues = stepResult.values;
      if (stepResult.blocs) updatedBlocs = stepResult.blocs;
      if (stepResult.ongoingNews) globalTrendNews.push(stepResult.ongoingNews);
      if (stepResult.completionNews) globalTrendNews.push(stepResult.completionNews);
      if (stepResult.completedTrend) {
        trendHistory = [...trendHistory, stepResult.completedTrend];
      } else if (stepResult.trend) {
        activeTrends = [...activeTrends, stepResult.trend];
      }
    }
    // Always reschedule next spawn (even if capped, so we retry on the next interval)
    nextTrendPoll = scheduleNextTrendPoll(nextPollNum);
  }

  const countryDataAfterTrend = {
    ...state.countryData,
    vals: updatedCountryValues,
    blocs: updatedBlocs
  };

  const { results: newResults, newsEvents, blocStats: newBlocStats } = conductPoll(votingDataRef, state.candidates, nextPollNum, countryDataAfterTrend);


  // --- BEGIN: Apply bloc targeting ideology shift ---
  let updatedTargetedBlocId = state.targetedBlocId ?? null;
  let updatedTargetingStartWeek = state.targetingStartWeek ?? null;
  let updatedTargetingWeeksActive = state.targetingWeeksActive ?? 0;

  if (updatedTargetedBlocId && countryDataAfterTrend.blocs) {
    const targetedBloc = countryDataAfterTrend.blocs.find(b => b.id === updatedTargetedBlocId);
    if (targetedBloc) {
      const playerCandidate = state.candidates.find(c => c.is_player);
      if (playerCandidate) {
        // Increment the counter each poll while actively targeting
        updatedTargetingWeeksActive += 1;
      }
    }
  }
  // --- END: Apply bloc targeting ideology shift ---


  // Update previous poll results
  const newPreviousResults: Record<string, number> = {};
  newResults.forEach(result => {
    newPreviousResults[result.candidate.party] = result.percentage;
  });

  // --- BEGIN: Check for AI Leadership Changes ---
  let activeCandidates = state.candidates;
  let leadershipNews: string[] = [];
  let playerCrisisEvent: any = null;
  let partyDissolutionNews: string[] = [];

  if (nextPollNum < state.totalPolls) {
    const changes = checkForLeadershipChanges(
      state.candidates,
      state.initialPollResults,
      newPreviousResults,
      state.eventVariables,
      state.country,
      state.incumbentGovernment,
    );
    activeCandidates = changes.candidates;
    leadershipNews = changes.news;
    playerCrisisEvent = changes.playerCrisisEvent || null;

    // --- BEGIN: Check for Party Dissolution ---
    const dissolutionResult = checkForPartyDissolution(
      activeCandidates,
      state.pollingHistory,
      newPreviousResults
    );
    activeCandidates = dissolutionResult.candidates;
    if (dissolutionResult.dissolvedParties.length > 0) {
      finalIncumbentGovernment = finalIncumbentGovernment.filter(
        p => !dissolutionResult.dissolvedParties.includes(p)
      );
    }
    if (dissolutionResult.news.length > 0) {
      partyDissolutionNews.push(...dissolutionResult.news);
    }
    // --- END: Check for Party Dissolution ---

    // --- BEGIN: Check for New Party Formation ---
    if (newBlocStats && newBlocStats.length > 0) {
      const formationResult = checkForNewPartyFormation(
        newBlocStats,
        activeCandidates,
        state.eventVariables,
        state.country,
        countryDataAfterTrend
      );
      if (formationResult.newCandidate) {
        activeCandidates.push(formationResult.newCandidate);
      }
      if (formationResult.news.length > 0) {
        partyDissolutionNews.push(...formationResult.news); // add to same news array for convenience
      }
    }
    // --- END: Check for New Party Formation ---

    // --- BEGIN: Check for Party Splits ---
    {
      const splitResult = checkForPartySplit(
        activeCandidates,
        state.pollingHistory,
        newPreviousResults,
        state.eventVariables,
        state.country
      );
      activeCandidates = splitResult.candidates;
      if (splitResult.splitInfo) {
        const gov = state.incumbentGovernment ?? [];
        if (gov.includes(splitResult.splitInfo.oldParty)) {
          if (!splitResult.splitInfo.isBreakaway) {
            // Full split: old party out, both splinters in
            finalIncumbentGovernment = finalIncumbentGovernment
              .filter(p => p !== splitResult.splitInfo!.oldParty)
              .concat(splitResult.splitInfo.newParties);
          }
          // Breakaway: parent stays in gov, faction does NOT join — no change
        }
      }
      if (splitResult.news.length > 0) {
        partyDissolutionNews.push(...splitResult.news);
      }
    }
    // --- END: Check for Party Splits ---

    // --- BEGIN: Check for Party Mergers ---
    {
      const mergerResult = checkForPartyMerger(
        activeCandidates,
        newPreviousResults,
        state.eventVariables,
        state.country
      );
      activeCandidates = mergerResult.candidates;
      if (mergerResult.mergerInfo) {
        const gov = state.incumbentGovernment ?? [];
        const eitherWasGov = mergerResult.mergerInfo.oldParties.some(p => gov.includes(p));
        if (eitherWasGov) {
          finalIncumbentGovernment = finalIncumbentGovernment
            .filter(p => !mergerResult.mergerInfo!.oldParties.includes(p))
            .concat([mergerResult.mergerInfo.newParty]);
        }
      }
      if (mergerResult.news.length > 0) {
        partyDissolutionNews.push(...mergerResult.news);
      }
    }
    // --- END: Check for Party Mergers ---
  }

  // -- BEGIN: WEEK 2 INITIAL GOVERNMENT FORMATION --
  if (nextPollNum === 2 && (!state.incumbentGovernment || state.incumbentGovernment.length === 0)) {
    const hasPlayer = state.candidates.some(c => c.is_player);
    if (hasPlayer && !playerCrisisEvent) {
      playerCrisisEvent = {
        title: "Initial Government Formation",
        description: `Following the dramatic entry of ${state.playerCandidate?.name} into the campaign, the political landscape is fractured. Initial polls suggest no single party commands a clear majority. As a key player, do you wish to initiate backroom negotiations to form a coalition government now, or allow the largest polling party to assert a minority government?`,
        choices: [
          {
            text: "Enter coalition negotiations.",
            effect: {},
            boost: 0,
            internalAction: {
              type: 'START_COALITION'
            }
          },
          {
            text: "Let the largest party form a minority government.",
            effect: {},
            boost: 0,
            internalAction: {
              type: 'AUTO_FORM_GOVERNMENT'
            }
          }
        ]
      };
    } else if (!hasPlayer) {
      // If AI only, just slap the largest party in as incumbent to simulate
      // an initial government. Sort by new polls.
      const sortedByPolls = [...newResults].sort((a, b) => b.percentage - a.percentage);
      // NOTE: This will be overwritten by the state update at the end of the function.
      // Easiest is to handle this down where we construct the return object.
      // But we will actually do it below.
    }
  }
  // -- END: WEEK 2 INITIAL GOVERNMENT FORMATION --
  // --- END: Check for AI Leadership Changes ---

  // Re-map results to point to the active candidates
  const finalCandidatesMap = new Map(activeCandidates.map(c => [c.id, c]));
  const finalNewResults = newResults.map(r => ({
    ...r,
    candidate: finalCandidatesMap.get(r.candidate.id) || r.candidate
  }));

  // Calculate changes from previous poll
  const resultsWithChange = finalNewResults.map(result => ({
    ...result,
    change: result.percentage - (state.previousPollResults[result.candidate.party] || result.percentage)
  }));
  const resultsByCandidateId = new Map(resultsWithChange.map(result => [result.candidate.id, result]));

  // --- BEGIN: Add news for all parties with polling surges/drops ---
  const partyPollingNews: string[] = [];
  const incumbentParties = state.incumbentGovernment ?? [];
  resultsWithChange.forEach(result => {

    const newsTitle = (Math.random() < 0.7 ? result.candidate.party : result.candidate.name);
    const isGovParty = incumbentParties.length > 0 && incumbentParties.includes(result.candidate.party);
    const isOppParty = incumbentParties.length > 0 && !isGovParty;
    // 60% chance to pull from gov/opp-flavoured pool; rest falls back to generic
    const useFlavouredPool = Math.random() < 0.6;

    let newsProbability = 0.05;
    newsProbability += (result.percentage / 100) * 1.5;
    if (Math.abs(result.change) > 1.5) {
      newsProbability += 0.8;
    } else if (Math.abs(result.change) > 1.0) {
      newsProbability += 0.3;
    }

    if (Math.random() < newsProbability || (result.candidate === state.playerCandidate)) {
      if (Math.abs(result.change) > 1.0) {
        if (result.change > 0) {
          // Surge headline: prefer gov/opp flavour when available
          let pool = SURGE_MESSAGES;
          if (useFlavouredPool && isGovParty) pool = GOVERNMENT_SURGE_TEMPLATES;
          else if (useFlavouredPool && isOppParty) pool = OPPOSITION_SURGE_TEMPLATES;
          const template = pool[Math.floor(Math.random() * pool.length)];
          partyPollingNews.push(substituteNewsVariables(
            template,
            { newsTitle },
            state.eventVariables,
            state.country
          ));
        } else {
          // Drop headline: prefer gov/opp flavour when available
          let pool = LOSE_MESSAGES;
          if (useFlavouredPool && isGovParty) pool = GOVERNMENT_LOSE_TEMPLATES;
          else if (useFlavouredPool && isOppParty) pool = OPPOSITION_LOSE_TEMPLATES;
          const template = pool[Math.floor(Math.random() * pool.length)];
          partyPollingNews.push(substituteNewsVariables(
            template,
            { newsTitle },
            state.eventVariables,
            state.country
          ));
        }
      } else if (Math.abs(result.change) > 0.5) {
        if (result.change > 0) {
          const template = STEADY_MESSAGES[Math.floor(Math.random() * STEADY_MESSAGES.length)];
          partyPollingNews.push(substituteNewsVariables(
            template,
            { newsTitle },
            state.eventVariables,
            state.country
          ));
        } else {
          const template = MIXED_MESSAGES[Math.floor(Math.random() * MIXED_MESSAGES.length)];
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

    // If both parties are > 8%
    if (partyA.percentage >= 8 && partyB.percentage >= 8) {
      const prevPctA = state.previousPollResults[partyA.candidate.party] || 0;
      const prevPctB = state.previousPollResults[partyB.candidate.party] || 0;

      // partyA is current above partyB. Did partyA overtake partyB?
      // Meaning previously, prevPctA was less than prevPctB.
      if (prevPctA < prevPctB) {
        // High chance to generate news
        if (Math.random() < 0.6) {
          const template = OVERTAKE_TEMPLATES[Math.floor(Math.random() * OVERTAKE_TEMPLATES.length)];
          let headline = substituteNewsVariables(
            template,
            { partyA: partyA.candidate.party, partyB: partyB.candidate.party },
            state.eventVariables,
            state.country
          );
          partyPollingNews.push(headline);
        }
      }
    }
  }
  // --- END: Add Overtake News ---

  // --- BEGIN: Party Polling Trends (Gaffes / Positive Events) ---
  const trendNews: string[] = [];

  // We process ALL candidates (including player)
  activeCandidates.forEach(candidate => {
    // 1) Evaluate if they have an active PartyTrend
    if (candidate.trend && candidate.trend.weeksRemaining > 0) {
      candidate.trend.weeksRemaining -= 1;

      // Apply polling impact
      candidate.base_utility_modifier = Math.max(-500, Math.min(500, (candidate.base_utility_modifier || 0) + candidate.trend.weeklyEffect));

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
      const candidateResult = resultsByCandidateId.get(candidate.id);
      const currentPolling = candidateResult ? candidateResult.percentage : 0;
      const currentSwing = candidateResult ? candidateResult.change : 0;

      if (Math.abs(currentSwing) < 0.3) {
        return; // Only show events if there is a polling shift to explain it
      }

      let eventProbability = 0.04;
      eventProbability += (currentPolling / 100) * 0.6;
      eventProbability += Math.abs(currentSwing) * 0.15; // the bigger the swing, the more likely an event

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
        candidate.base_utility_modifier = Math.max(-500, Math.min(500, (candidate.base_utility_modifier || 0) + candidate.trend.weeklyEffect));
      }
    }
  });

  const DRIFT_WEEKS = 5;          // polls over which total shift is applied
  const DRIFT_TOTAL_MIN = 8;      // minimum total shift (points on axis) — reduced to be less dramatic
  const DRIFT_TOTAL_MAX = 18;     // maximum total shift — reduced to be less dramatic
  const positionShiftNews: string[] = [];

  /**
   * Picks a drift axis and direction for a non-player candidate.
   * ~85% of the time: targets the nearest promising growth bloc and closes
   * the biggest gap on a single axis (so a right-wing party drifts right toward
   * moderate-right blocs, never randomly jumping leftward).
   * ~15% of the time: random axis + gravity-toward-center (leadership mistake).
   */
  function chooseDriftTarget(
    candidate: (typeof activeCandidates)[0],
    blocs: NonNullable<typeof state.countryData.blocs>,
    candidateShares: Map<string, number> // blocId -> candidate's share in that bloc
  ): { axisKey: keyof PoliticalValues; direction: 1 | -1 } | null {
    // 15% chance: erratic leadership mistake — random axis, gravity-toward-center direction
    if (Math.random() < 0.15) {
      const axisKey = AXIS_KEYS[Math.floor(Math.random() * AXIS_KEYS.length)];
      const axisIndex = AXIS_KEYS.indexOf(axisKey);
      const currentValue = candidate.vals[axisIndex];
      const direction = (Math.random() < (0.5 - currentValue / 200)) ? 1 : -1;
      return { axisKey, direction };
    }

    // Score each bloc by growth potential:
    //   potential = weight * (1 - currentShare) — large blocs where we're weak
    // Filter out blocs that are too ideologically distant (no point chasing them)
    const MAX_VIABLE_DISTANCE = 120; // Euclidean distance threshold across all 7 axes

    let bestBloc: (typeof blocs)[0] | null = null;
    let bestScore = -Infinity;

    for (const bloc of blocs) {
      // Compute Euclidean distance between candidate and bloc center
      const dist = Math.sqrt(
        AXIS_KEYS.reduce((sum, key, i) => {
          const diff = candidate.vals[i] - bloc.center[key];
          return sum + diff * diff;
        }, 0)
      );
      if (dist > MAX_VIABLE_DISTANCE) continue;

      const share = candidateShares.get(bloc.id) ?? 50; // default 50% if unknown
      const potential = bloc.weight * (1 - share / 100);
      if (potential > bestScore) {
        bestScore = potential;
        bestBloc = bloc;
      }
    }

    if (!bestBloc) return null;

    // Among all axes, find the one with the largest gap to the target bloc's center.
    // Only consider axes where the gap is at least 3 points (meaningful movement).
    let bestAxisKey: keyof PoliticalValues | null = null;
    let bestGap = 2; // minimum threshold

    for (const key of AXIS_KEYS) {
      const axisIndex = AXIS_KEYS.indexOf(key);
      const gap = bestBloc.center[key] - candidate.vals[axisIndex];
      if (Math.abs(gap) > bestGap) {
        bestGap = Math.abs(gap);
        bestAxisKey = key;
      }
    }

    if (!bestAxisKey) return null;

    const axisIndex = AXIS_KEYS.indexOf(bestAxisKey);
    const targetValue = bestBloc.center[bestAxisKey];
    const direction = targetValue > candidate.vals[axisIndex] ? 1 : -1;
    return { axisKey: bestAxisKey, direction };
  }

  const nonPlayerCandidates = activeCandidates.filter(c => !c.is_player);
  nonPlayerCandidates.forEach(candidate => {
    const targetCandidate = activeCandidates.find(c => c.id === candidate.id);
    if (!targetCandidate) return;

    // 1) Tick any in-progress drift first
    if (targetCandidate.ideologyDrift && targetCandidate.ideologyDrift.weeksRemaining > 0) {
      const drift = targetCandidate.ideologyDrift;
      drift.weeksRemaining -= 1;
      drift.axisIndex = AXIS_KEYS.indexOf(drift.axisKey); // safety: ensure index in sync
      targetCandidate.vals[drift.axisIndex] = Math.max(
        -100,
        Math.min(100, targetCandidate.vals[drift.axisIndex] + drift.weeklyShift)
      );

      const isPositiveDrift = drift.weeklyShift > 0;
      const useLeaderName = Math.random() < 0.5;

      // Clear drift once complete
      if (drift.weeksRemaining <= 0) {
        targetCandidate.ideologyDrift = undefined;

        // Always fire a completion headline — announces the newly adopted position
        const completionTemplates = IDEOLOGY_DRIFT_COMPLETE_TEMPLATES[drift.axisKey];
        const completionArray = isPositiveDrift ? completionTemplates.positive : completionTemplates.negative;
        const completionTemplate = completionArray[Math.floor(Math.random() * completionArray.length)];
        positionShiftNews.push(substituteNewsVariables(
          completionTemplate,
          {
            candidate_name: candidate.name,
            party: candidate.party,
            leader_name: useLeaderName ? candidate.name : candidate.party
          },
          state.eventVariables,
          state.country
        ));
      } else {
        // ~40% chance each mid-drift week to generate a follow-up "still shifting" story
        if (Math.random() < 0.4) {
          const ongoingTemplates = IDEOLOGY_DRIFT_ONGOING_TEMPLATES[drift.axisKey];
          const ongoingArray = isPositiveDrift ? ongoingTemplates.positive : ongoingTemplates.negative;
          const ongoingTemplate = ongoingArray[Math.floor(Math.random() * ongoingArray.length)];
          positionShiftNews.push(substituteNewsVariables(
            ongoingTemplate,
            {
              candidate_name: candidate.name,
              party: candidate.party,
              leader_name: useLeaderName ? candidate.name : candidate.party
            },
            state.eventVariables,
            state.country
          ));
        }
      }

      return; // don't evaluate a new drift while one is active
    }

    // 2) Decide whether to commit a new drift this poll.
    //    Probability is deliberately low — big ideological moves are rare.
    const candidateResult = resultsByCandidateId.get(candidate.id);
    const currentPolling = candidateResult ? candidateResult.percentage : 0;
    const currentSwing = candidateResult ? candidateResult.change : 0;

    // Base 2%, scaled slightly by size and swing — max ~12% in dramatic circumstances
    let driftProbability = 0.02;
    driftProbability += (currentPolling / 100) * 0.06;
    if (Math.abs(currentSwing) > 2.0) driftProbability += 0.04;

    if (Math.random() < driftProbability) {
      // Build a map of per-bloc support for this candidate (from current blocStats)
      const candidateBlocShares = new Map<string, number>();
      const currentBlocStats = state.blocStats ?? [];
      for (const bs of currentBlocStats) {
        const share = bs.percentages[candidate.party] ?? 0;
        candidateBlocShares.set(bs.blocId, share);
      }

      // Choose which axis and direction to drift, using bloc-targeted logic
      const blocs = state.countryData.blocs ?? [];
      const driftTarget = blocs.length > 0
        ? chooseDriftTarget(targetCandidate, blocs, candidateBlocShares)
        : null;

      // If no viable target found (e.g. party already close to all blocs), skip this cycle
      if (!driftTarget) return;

      const { axisKey: axisToShift, direction } = driftTarget;
      const axisIndex = AXIS_KEYS.indexOf(axisToShift);

      // Clamp total shift so it doesn't overshoot the target bloc's center value
      // (prevents a party from blowing past its intended destination)
      let totalShift = (DRIFT_TOTAL_MIN + Math.random() * (DRIFT_TOTAL_MAX - DRIFT_TOTAL_MIN)) * direction;
      const currentVal = targetCandidate.vals[axisIndex];
      if (direction > 0 && currentVal + totalShift > 100) totalShift = 100 - currentVal;
      if (direction < 0 && currentVal + totalShift < -100) totalShift = -100 - currentVal;

      const weeklyShift = totalShift / DRIFT_WEEKS;

      // Commit the drift — first week applied immediately
      targetCandidate.ideologyDrift = {
        axisKey: axisToShift,
        axisIndex,
        weeklyShift,
        weeksRemaining: DRIFT_WEEKS - 1, // already applying week 1 now
        totalWeeks: DRIFT_WEEKS,
      };
      targetCandidate.vals[axisIndex] = Math.max(
        -100,
        Math.min(100, targetCandidate.vals[axisIndex] + weeklyShift)
      );

      // Generate news on the poll that kicks off the drift
      const isPositiveShift = direction > 0;
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
  });
  // --- END: Gradual ideology drift for non-player parties ---

  // --- BEGIN: Process event-driven ideology drifts (player + any candidate) ---
  // Event drifts are multi-axis IdeologyDrift[] on each candidate, applied over
  // EVENT_DRIFT_WEEKS. This is the same tick-down pattern as the AI ideologyDrift
  // but supports multiple concurrent axes from a single event.
  const eventDriftNews: string[] = [];
  activeCandidates.forEach(candidate => {
    if (!candidate.eventDrifts || candidate.eventDrifts.length === 0) return;

    const stillActive: typeof candidate.eventDrifts = [];
    for (const drift of candidate.eventDrifts) {
      if (drift.weeksRemaining <= 0) continue;

      drift.weeksRemaining -= 1;
      drift.axisIndex = AXIS_KEYS.indexOf(drift.axisKey); // keep in sync
      candidate.vals[drift.axisIndex] = Math.max(
        -100,
        Math.min(100, candidate.vals[drift.axisIndex] + drift.weeklyShift)
      );

      if (drift.weeksRemaining > 0) {
        stillActive.push(drift);
      } else {
        // Drift completed — optionally generate a subtle completion news item
        const isPositive = drift.weeklyShift > 0;
        const useLeaderName = Math.random() < 0.5;
        const completionTemplates = IDEOLOGY_DRIFT_COMPLETE_TEMPLATES[drift.axisKey];
        if (completionTemplates) {
          const completionArray = isPositive ? completionTemplates.positive : completionTemplates.negative;
          if (completionArray && completionArray.length > 0 && !candidate.is_player && Math.random() < 0.3) {
            const completionTemplate = completionArray[Math.floor(Math.random() * completionArray.length)];
            eventDriftNews.push(substituteNewsVariables(
              completionTemplate,
              {
                candidate_name: candidate.name,
                party: candidate.party,
                leader_name: useLeaderName ? candidate.name : candidate.party
              },
              state.eventVariables,
              state.country
            ));
          }
        }
      }
    }

    candidate.eventDrifts = stillActive.length > 0 ? stillActive : undefined;
  });
  // --- END: Process event-driven ideology drifts ---

  // Combine all news sources into a priority-tagged feed
  const substitutedNewsEvents = newsEvents.map((news: string) =>
    substituteNewsVariables(news, {}, state.eventVariables, state.country)
  );

  const newsItems: NewsItem[] = [
    ...leadershipNews.map(text => ({ text, priority: 'critical' as const, category: 'leadership' as const })),
    ...partyDissolutionNews.map(text => ({ text, priority: 'critical' as const, category: 'dissolution' as const })),
    ...activeTrends.map(trend => ({ text: `${trend.title} · ${trend.remainingWeeks}w remaining`, priority: 'high' as const, category: 'trend' as const })),
    ...globalTrendNews.map(text => ({ text, priority: 'high' as const, category: 'trend' as const })),
    ...state.playerEventNews.map(text => ({ text, priority: 'high' as const, category: 'event' as const })),
    ...trendNews.map(text => ({ text, priority: 'medium' as const, category: 'trend' as const })),
    ...positionShiftNews.map(text => ({ text, priority: 'low' as const, category: 'drift' as const })),
    ...eventDriftNews.map(text => ({ text, priority: 'low' as const, category: 'drift' as const })),
    ...partyPollingNews.map(text => ({ text, priority: 'medium' as const, category: 'polling' as const })),
    ...substitutedNewsEvents.map(text => ({ text, priority: 'low' as const, category: 'flavor' as const })),
  ];

  // Sort by priority: critical → high → medium → low. Within each tier, randomize slightly.
  const priorityOrder: Record<NewsItem['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  newsItems.sort((a, b) => {
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    if (pa !== pb) return pa - pb;
    return Math.random() - 0.5;
  });

  // Critical items are always included, then fill up to 8 total
  const criticalItems = newsItems.filter(n => n.priority === 'critical');
  const nonCriticalItems = newsItems.filter(n => n.priority !== 'critical');
  const remainingSlots = Math.max(0, 8 - criticalItems.length);
  const sortedPoliticalNews = [...criticalItems, ...nonCriticalItems.slice(0, remainingSlots)];

  // Calculate post-election stats if this is the final poll
  let postElectionStats: PostElectionStats | undefined = undefined;
  if (nextPollNum >= state.totalPolls) {
    // Compute voter transfers from initial poll to final poll
    const rawTransfers = getVoterTransferMatrix(activeCandidates);
    // Keep all transfers >=1% of the from-party's own voters (includes Not Voting on both sides)
    const significantTransfers = rawTransfers.filter(
      t => t.percentage >= 1.0
    );
    postElectionStats = calculatePostElectionStats(
      resultsWithChange,
      state.initialPollResults,
      state.initialBlocStats,
      newBlocStats
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

  // Produce a new candidates array with fresh `vals` references so that React's
  // reference-equality check detects the per-poll ideology changes (drift, bloc
  // targeting, etc.) and re-renders components like IdeologyScatterPlot.
  const freshCandidates = activeCandidates.map(c => ({
    ...c,
    vals: [...c.vals],
    poll_percentage: newPreviousResults[c.party] || c.poll_percentage,
    eventDrifts: c.eventDrifts ? c.eventDrifts.map(d => ({ ...d })) : undefined,
    leaderCooldown: c.leaderCooldown ? Math.max(0, c.leaderCooldown - 1) : 0
  }));

  const syncedPlayerCandidate = freshCandidates.find(c => c.is_player) ?? state.playerCandidate;

  const hasPlayer = state.candidates.some(c => c.is_player);
  if (nextPollNum === 2 && finalIncumbentGovernment.length === 0 && !hasPlayer) {
    const sortedByPolls = [...resultsWithChange].sort((a, b) => b.percentage - a.percentage);
    finalIncumbentGovernment = [sortedByPolls[0].candidate.party];
  }

  return {
    ...state,
    candidates: freshCandidates,
    playerCandidate: syncedPlayerCandidate,
    currentPoll: nextPollNum,
    pollResults: resultsWithChange,
    previousPollResults: newPreviousResults,
    politicalNews: sortedPoliticalNews,
    playerEventNews: [],
    countryData: countryDataAfterTrend,
    activeTrend: activeTrends,
    trendHistory,
    nextTrendPoll,
    blocStats: newBlocStats,
    previousBlocStats: state.blocStats,
    blocStatsHistory: updatedBlocStatsHistory,
    postElectionStats,
    pollingHistory: [
      ...state.pollingHistory,
      {
        week: nextPollNum,
        percentages: { ...newPreviousResults }
      }
    ],
    phase: nextPollNum >= state.totalPolls ? 'results' : 'campaign',
    incumbentGovernment: finalIncumbentGovernment,
    targetingWeeksActive: updatedTargetingWeeksActive,
    pendingPlayerEvent: playerCrisisEvent || null
  };
}
