import { GameState, PoliticalValues, PostElectionStats, BlocSwingData, PartyBlocSupport, TARGET_SHIFT } from '@/types/game';
import { EventVariables } from '@/lib/eventTemplates';
import {
  applyTrendStep,
  conductPoll,
  createTrend,
  formatTrendStartHeadline,
  scheduleNextTrendPoll,
  getVoterTransferMatrix,
  MAX_ACTIVE_TRENDS,
  BlocStatistics
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
  IDEOLOGY_DRIFT_COMPLETE_TEMPLATES
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

        // Apply ideology shift every week of targeting
        AXIS_KEYS.forEach((key, index) => {
          const currentValue = playerCandidate.vals[index];
          const targetValue = targetedBloc.center[key];
          const difference = targetValue - currentValue;
          const shift = difference * TARGET_SHIFT;
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
  const resultsByCandidateId = new Map(resultsWithChange.map(result => [result.candidate.id, result]));

  // --- BEGIN: Add news for all parties with polling surges/drops ---
  const partyPollingNews: string[] = [];
  resultsWithChange.forEach(result => {

    const newsTitle = (Math.random() < 0.7 ? result.candidate.party : result.candidate.name);

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
          const template = SURGE_MESSAGES[Math.floor(Math.random() * SURGE_MESSAGES.length)];
          partyPollingNews.push(substituteNewsVariables(
            template,
            { newsTitle },
            state.eventVariables,
            state.country
          ));
        } else {
          const template = LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)];
          partyPollingNews.push(substituteNewsVariables(
            template,
            { newsTitle },
            state.eventVariables,
            state.country
          ));
        }
      } else if (Math.abs(result.change) > 1) {
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

    // If both parties are > 10%
    if (partyA.percentage >= 10 && partyB.percentage >= 10) {
      const prevPctA = state.previousPollResults[partyA.candidate.party] || 0;
      const prevPctB = state.previousPollResults[partyB.candidate.party] || 0;

      // partyA is current above partyB. Did partyA overtake partyB?
      // Meaning previously, prevPctA was less than prevPctB.
      if (prevPctA < prevPctB) {
        // High chance to generate news
        if (Math.random() < 0.6) {
          const template = OVERTAKE_TEMPLATES[Math.floor(Math.random() * OVERTAKE_TEMPLATES.length)];
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

  // We process ALL candidates (including player)
  state.candidates.forEach(candidate => {
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
      const candidateResult = resultsByCandidateId.get(candidate.id);
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

  const DRIFT_WEEKS = 5;          // polls over which total shift is applied
  const DRIFT_TOTAL_MIN = 15;     // minimum total shift (points on axis)
  const DRIFT_TOTAL_MAX = 30;     // maximum total shift
  const positionShiftNews: string[] = [];

  const nonPlayerCandidates = state.candidates.filter(c => !c.is_player);
  nonPlayerCandidates.forEach(candidate => {
    const targetCandidate = state.candidates.find(c => c.name === candidate.name);
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
      const axisToShift = AXIS_KEYS[Math.floor(Math.random() * AXIS_KEYS.length)];
      const axisIndex = AXIS_KEYS.indexOf(axisToShift);
      const direction = Math.random() < 0.5 ? 1 : -1;
      const totalShift = (DRIFT_TOTAL_MIN + Math.random() * (DRIFT_TOTAL_MAX - DRIFT_TOTAL_MIN)) * direction;
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
  state.candidates.forEach(candidate => {
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

  // Combine all news sources into a single array first
  const substitutedNewsEvents = newsEvents.map(news =>
    substituteNewsVariables(news, {}, state.eventVariables, state.country)
  );

  const allNewsItems = [
    ...globalTrendNews,
    ...state.playerEventNews,
    ...substitutedNewsEvents,
    ...partyPollingNews,
    ...trendNews,
    ...positionShiftNews,
    ...eventDriftNews
  ];

  // Sort the combined array by word count in ascending order, then cap to 4 items.
  const sortedPoliticalNews = allNewsItems.sort((a, b) => {
    if (Math.random() < 0.6) {
      return (a.split(' ').length - b.split(' ').length);
    }
    else { return 1; }
  }).slice(0, 4);

  // Calculate post-election stats if this is the final poll
  let postElectionStats: PostElectionStats | undefined = undefined;
  if (nextPollNum >= state.totalPolls) {
    // Compute voter transfers from initial poll to final poll
    const candidateNames = state.candidates.map(c => c.party);
    const rawTransfers = getVoterTransferMatrix(candidateNames);
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
  const freshCandidates = state.candidates.map(c => ({
    ...c,
    vals: [...c.vals],
    eventDrifts: c.eventDrifts ? c.eventDrifts.map(d => ({ ...d })) : undefined
  }));

  return {
    ...state,
    candidates: freshCandidates,
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
    targetedBlocId: updatedTargetedBlocId,
    targetingStartWeek: updatedTargetingStartWeek,
    targetingWeeksActive: updatedTargetingWeeksActive,
    pollingHistory: [
      ...state.pollingHistory,
      {
        week: nextPollNum,
        percentages: { ...newPreviousResults }
      }
    ],
    phase: nextPollNum >= state.totalPolls ? 'results' : 'campaign'
  };
}
