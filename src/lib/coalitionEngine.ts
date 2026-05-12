import { Candidate, CABINET_POSITIONS, VALUES, DEBUG } from '@/types/game';

export interface CoalitionCompatibility {
  candidate: Candidate;
  percentage: number;
  compatibility: number;
  appeal: number;
}

export function getBiggestPolicyDifference(party1: Candidate, party2: Candidate): string {
  let maxDiff = 0;
  let maxIndex = 0;
  for (let i = 0; i < party1.vals.length; i++) {
    const diff = Math.abs(party1.vals[i] - party2.vals[i]);
    if (diff > maxDiff) {
      maxDiff = diff;
      maxIndex = i;
    }
  }

  const policyNames = [
    'Social Policy', // 0: prog_cons
    'Foreign Policy', // 1: nat_glob
    'Environmental Policy', // 2: env_eco
    'Economic Policy', // 3: soc_cap
    'Defense Policy', // 4: pac_mil
    'Governance Structure', // 5: auth_ana
    'Religious Values' // 6: rel_sec
  ];
  return policyNames[maxIndex] || 'Fundamental Values';
}

export function calculatePartyCompatibility(party1: Candidate, party2: Candidate): number {
  let totalDistance = 0;

  for (let i = 0; i < VALUES.length; i++) {
    const diff = Math.abs(party1.vals[i] - party2.vals[i]);
    totalDistance += diff;
  }

  // Make compatibility drop off more sharply for large distances
  // If you increase the 110, parties will be more compatible
  const maxPossibleDistance = VALUES.length * 110;
  let compatibility = 100 - (totalDistance / maxPossibleDistance * 100);

  // Further penalize very large distances (if > 60% of max distance, apply extra penalty)
  if (totalDistance > maxPossibleDistance * 0.6) {
    compatibility -= 10;
  }
  // Clamp to [0, 100]
  compatibility = Math.max(0, Math.min(100, compatibility));
  if (DEBUG) {
    console.log('DEBUG: calculatePartyCompatibility', { party1: party1.party, party2: party2.party, compatibility });
  }
  return compatibility;
}

export function calculateCoalitionWillingness(
  leadParty: Candidate,
  partnerParty: Candidate,
  leadPercentage: number,
  partnerPercentage: number,
  cabinetImportanceOffered: number = 0
): number {
  const compatibility = calculatePartyCompatibility(leadParty, partnerParty);
  let baseWillingness = compatibility;

  // Add a strong penalty for low compatibility
  if (compatibility < 40) {
    baseWillingness -= 10;
  } else if (compatibility < 60) {
    baseWillingness -= 5;
  }

  // Adjust based on lead party's strength
  if (leadPercentage > 40) {
    baseWillingness += 5; // Attractive to join strong party
  } else if (leadPercentage > 30) {
    baseWillingness += 2;
  } else {
    baseWillingness -= 10; // Risky to join weak party
  }

  // Adjust based on partner's strength
  if (partnerPercentage > 15) {
    baseWillingness -= 10; // Larger parties are harder to convince
  } else if (partnerPercentage < 5) {
    baseWillingness += 5; // Smaller parties are more willing
  }

  // Cabinet position appeal
  const cabinetAppeal = calculateCabinetAppeal(cabinetImportanceOffered, partnerPercentage, compatibility);
  const willingness = Math.max(0, Math.min(100, baseWillingness + cabinetAppeal));
  if (DEBUG) {
    console.log('DEBUG: calculateCoalitionWillingness', {
      leadParty: leadParty.party,
      partnerParty: partnerParty.party,
      leadPercentage,
      partnerPercentage,
      baseWillingness,
      cabinetImportanceOffered,
      cabinetAppeal,
      willingness
    });
  }
  return willingness;
}

export function calculateCabinetAppeal(
  importanceOffered: number,
  partnerPercentage: number,
  compatibility: number
): number {
  if (importanceOffered === 0) return -40; // Penalty for no positions

  let appeal = importanceOffered * 1;

  // Smaller parties are happier with smaller roles
  if (partnerPercentage < 5) {
    appeal += 10;
  } else if (partnerPercentage > 15) {
    appeal -= 10;
  }

  // High compatibility parties are more flexible
  if (compatibility > 70) {
    appeal += 10;
  } else if (compatibility < 40) {
    appeal -= 35;
  }

  return Math.max(-30, Math.min(60, appeal));
}

export function getAvailableCabinetPositions(allocations: Record<string, string[]>): Array<{
  name: string;
  importance: number;
  max_slots: number;
  description: string;
  available_slots: number;
}> {
  const available = [];

  for (const [position, details] of Object.entries(CABINET_POSITIONS)) {
    const allocated = allocations[position] || [];
    const availableSlots = details.max_slots - allocated.length;

    if (availableSlots > 0) {
      available.push({
        name: position,
        importance: details.importance,
        max_slots: details.max_slots,
        description: details.description,
        available_slots: availableSlots
      });
    }
  }

  return available.sort((a, b) => b.importance - a.importance);
}

export function getPartyPriorityPositions(candidate: Candidate): string[] {
  const priorities = [];
  const vals = candidate.vals;

  // Map political values to preferred ministries

  // Every party wants Deputy Prime Minister
  priorities.push('Deputy Prime Minister')
  // soc_cap (socialist-capitalist): index 3
  if (Math.abs(vals[3]) > 20) {
    priorities.push('Finance', 'Transport', 'Junior Ministers');
  }

  // env_eco (environmental-economic): index 2
  if (Math.abs(vals[2]) > 20) {
    priorities.push('Environment', 'Energy', 'Housing', 'Agriculture');
  }

  // pac_mil (pacifist-militarist): index 4
  if (Math.abs(vals[4]) > 20) {
    priorities.push('Defence', 'Foreign');
  }

  // prog_cons (progressive-conservative): index 0
  if (Math.abs(vals[0]) > 20) {
    priorities.push('Education', 'Health', 'Interior', 'Justice');
  }

  // Default fallback positions
  if (priorities.length === 0) {
    priorities.push('Junior Ministers');
  }

  return priorities;
}

export function generateCoalitionPolicyQuestion(party1: Candidate, party2: Candidate): {
  topic: string;
  question: string;
  options: Array<{
    text: string;
    appeal: number;
    ideologyShift: number;
  }>;
} | null {
  const vals1 = party1.vals;
  const vals2 = party2.vals;

  // Economic policy question
  if (Math.abs(vals1[3] - vals2[3]) > 20) {
    return {
      topic: 'Economic Policy',
      question: 'What should be the government\'s approach to economic policy?',
      options: [
        {
          text: 'Increase public spending and expand social programs',
          appeal: vals2[3] < 0 ? 20 : -10,
          ideologyShift: -5
        },
        {
          text: 'Maintain current balance between public and private sector',
          appeal: Math.abs(vals2[3]) < 20 ? 15 : 0,
          ideologyShift: 0
        },
        {
          text: 'Reduce taxes and promote free market policies',
          appeal: vals2[3] > 0 ? 20 : -10,
          ideologyShift: 5
        }
      ]
    };
  }

  // Environmental policy question
  if (Math.abs(vals1[2] - vals2[2]) > 25) {
    return {
      topic: 'Environmental Policy',
      question: 'How should the government balance environmental protection with economic growth?',
      options: [
        {
          text: 'Prioritize environmental protection, even at economic cost',
          appeal: vals2[2] < 0 ? 25 : -15,
          ideologyShift: -10
        },
        {
          text: 'Seek balanced approach between environment and economy',
          appeal: Math.abs(vals2[2]) < 30 ? 10 : 0,
          ideologyShift: 0
        },
        {
          text: 'Focus on economic growth with reasonable environmental standards',
          appeal: vals2[2] > 0 ? 20 : -10,
          ideologyShift: 10
        }
      ]
    };
  }

  // Social issues question
  if (Math.abs(vals1[0] - vals2[0]) > 20) {
    return {
      topic: 'Social Policy',
      question: 'What should be the government\'s stance on social issues?',
      options: [
        {
          text: 'Advance progressive social reforms and equality initiatives',
          appeal: vals2[0] < 0 ? 20 : -15,
          ideologyShift: -8
        },
        {
          text: 'Maintain current social policies with gradual changes',
          appeal: Math.abs(vals2[0]) < 25 ? 12 : 0,
          ideologyShift: 0
        },
        {
          text: 'Preserve traditional values and institutions',
          appeal: vals2[0] > 0 ? 18 : -12,
          ideologyShift: 8
        }
      ]
    };
  }

  return null;
}

export function simulateCoalitionNegotiation(
  leadParty: Candidate,
  partnerParty: Candidate,
  leadPercentage: number,
  partnerPercentage: number,
  cabinetImportanceOffered: number,
  policyResponses: number[] = []
): {
  success: boolean;
  message: string;
  finalAppeal: number;
  baseWillingness: number;
  compatibility: number;
} {
  const compatibility = calculatePartyCompatibility(leadParty, partnerParty);
  let baseWillingness = compatibility;

  // Adjust based on party strength
  if (leadPercentage > 40) {
    baseWillingness += 10;
  } else if (leadPercentage < 25) {
    baseWillingness -= 15;
  }

  // Cabinet position appeal
  const cabinetAppeal = calculateCabinetAppeal(cabinetImportanceOffered, partnerPercentage, compatibility);

  // Policy response appeal
  const policyAppeal = policyResponses.reduce((sum, response) => sum + response, 0);


  // new: scale benefits by compatibility
  // Scale benefits by compatibility (0-1)
  const compatibilityFactor = compatibility !== 0 ? Math.max(0, compatibility / 100) : 0;
  const scaledAppeal = (cabinetAppeal + policyAppeal) * compatibilityFactor;

  // Add an RNG factor between -15 and +15 to introduce uncertainty
  const rngFactor = (Math.random() * 30) - 15;
  let finalAppeal = baseWillingness + scaledAppeal + rngFactor;

  if (DEBUG) {
    console.log('DEBUG: simulateCoalitionNegotiation', {
      leadParty: leadParty.party,
      partnerParty: partnerParty.party,
      leadPercentage,
      partnerPercentage,
      baseWillingness,
      cabinetImportanceOffered,
      cabinetAppeal,
      policyResponses,
      policyAppeal,
      rngFactor,
      finalAppeal
    });
  }


  let message = '';

  if (finalAppeal >= 100) {
    const options = [
      `${partnerParty.party} agrees to join the coalition!`,
      `${partnerParty.party} enthusiastically accepts the offer to form a government!`,
      `A deal is struck! ${partnerParty.party} will join the coalition.`,
      `Excellent news! ${partnerParty.party} is fully on board with the coalition.`
    ];
    message = options[Math.floor(Math.random() * options.length)];

  } else if (finalAppeal >= 90) {
    const options = [
      `${partnerParty.party} agrees to join the coalition after very careful consideration.`,
      `After intense internal debate, ${partnerParty.party} has decided to enter the coalition.`,
      `${partnerParty.party} accepts the coalition terms, though with some minor reservations.`,
      `It was a close call, but ${partnerParty.party} has agreed to form a government.`
    ];
    message = options[Math.floor(Math.random() * options.length)];

  } else if (finalAppeal >= 40) {
    const options = [
      `${partnerParty.party} disapproves of the coalition terms.`,
      `${partnerParty.party} might be open to a coalition, but backbenchers sabotage the deal.`,
      `The offer is a good starting point, but ${partnerParty.party} wants more.`,
      `${partnerParty.party} remains against the coalition and is looking around for a better deal.`
    ];
    message = options[Math.floor(Math.random() * options.length)];

  } else {
    // Generate ideological rejection specifically
    const biggestDiff = getBiggestPolicyDifference(leadParty, partnerParty);
    const options = [
      `${partnerParty.party} declines, citing fundamental disagreements on ${biggestDiff}.`,
      `Talks have collapsed. ${partnerParty.party} refuses to compromise their stance on ${biggestDiff}.`,
      `${partnerParty.party} walks away from the table due to irreconcilable differences regarding ${biggestDiff}.`,
      `The coalition offer is rejected outright. ${partnerParty.party} strongly opposes the position on ${biggestDiff}.`
    ];
    message = options[Math.floor(Math.random() * options.length)];
  }

  return {
    success: finalAppeal >= 90,
    message,
    finalAppeal,
    baseWillingness,
    compatibility
  };
}

export function findBestCoalitionPartners(
  leadParty: Candidate,
  availableParties: Candidate[],
  results: Array<{ candidate: Candidate; percentage: number }>
): Array<{ candidate: Candidate; compatibility: number; willingness: number; percentage: number }> {
  const resultsById = new Map(results.map(r => [r.candidate.id, r.percentage]));
  const leadPercentage = resultsById.get(leadParty.id) || 0;

  return availableParties
    .map(party => {
      const percentage = resultsById.get(party.id) || 0;
      const compatibility = calculatePartyCompatibility(leadParty, party);
      const willingness = calculateCoalitionWillingness(leadParty, party, leadPercentage, percentage);

      return { candidate: party, compatibility, willingness, percentage };
    })
    .sort((a, b) => {
      // Sort by willingness first, then compatibility
      if (Math.abs(a.willingness - b.willingness) < 5) {
        return b.compatibility - a.compatibility;
      }
      return b.willingness - a.willingness;
    });
}

function calculatePositionsToOffer(
  partnerPercentage: number,
  availablePositions: { name: string; importance: number; available_slots: number }[],
  leadPercentage: number
): number {
  // Offer positions roughly proportional to their share of the newly formed government coalition
  const combinedPercentage = leadPercentage + partnerPercentage;
  const premiumShare = combinedPercentage === 0 ? 0 : (partnerPercentage / combinedPercentage);
  const scaled = Math.round(premiumShare * availablePositions.length); // Use unique positions count roughly
  return Math.max(1, scaled); // Always offer at least 1
}

export function simulateAICoalitionNegotiation(
  leadParty: Candidate,
  partnerParty: Candidate,
  leadPercentage: number,
  partnerPercentage: number,
  allocations: Record<string, string[]>
): {
  success: boolean;
  cabinetPositions: string[];
  message: string;
  baseWillingness: number;
  compatibility: number;
} {
  const compatibility = calculatePartyCompatibility(leadParty, partnerParty);
  const priorityPositions = getPartyPriorityPositions(partnerParty);
  const availablePositions = getAvailableCabinetPositions(allocations);
  const availableByName = new Map(availablePositions.map(pos => [pos.name, pos]));
  // Determine number of positions to offer
  const numToOffer = calculatePositionsToOffer(partnerPercentage, availablePositions, leadPercentage);

  // Offer positions based on party's priorities and availability
  let positionsToOffer: string[] = [];
  const offeredSet = new Set<string>();
  for (const pos of priorityPositions) {
    if (positionsToOffer.length >= numToOffer) break;
    const found = availableByName.get(pos);
    if (found && found.available_slots > 0) {
      positionsToOffer.push(pos);
      offeredSet.add(pos);
    }
  }
  // If not enough, fill with any available positions
  for (const pos of availablePositions) {
    if (positionsToOffer.length >= numToOffer) break;
    if (!offeredSet.has(pos.name)) {
      positionsToOffer.push(pos.name);
      offeredSet.add(pos.name);
    }
  }

  const totalImportance = positionsToOffer.reduce((sum, pos) => {
    const position = availableByName.get(pos);
    return sum + (position?.importance || 10);
  }, 0);

  // Generate policy responses (AI assumes moderate positions)
  const policyResponses = [5, 3]; // Moderate appeal scores

  const result = simulateCoalitionNegotiation(
    leadParty,
    partnerParty,
    leadPercentage,
    partnerPercentage,
    totalImportance,
    policyResponses
  );
  if (DEBUG) {
    console.log('DEBUG: simulateAICoalitionNegotiation', {
      leadParty: leadParty.party,
      partnerParty: partnerParty.party,
      leadPercentage,
      partnerPercentage,
      positionsToOffer,
      totalImportance,
      policyResponses
    });
  }

  return {
    success: result.success,
    cabinetPositions: result.success ? positionsToOffer : [],
    message: result.message,
    baseWillingness: result.baseWillingness,
    compatibility: result.compatibility
  };
}

export function generatePlayerApproachOffer(
  leadParty: Candidate,
  playerParty: Candidate,
  leadPercentage: number,
  playerPercentage: number,
  allocations: Record<string, string[]>
): {
  message: string;
  offeredPositions: string[];
  totalImportance: number;
  questions: Array<{
    topic: string;
    question: string;
    options: Array<{
      text: string;
      appeal: number;
      ideologyShift: number;
    }>;
  }>;
} {
  const priorityPositions = getPartyPriorityPositions(playerParty);
  const availablePositions = getAvailableCabinetPositions(allocations);
  const availableByName = new Map(availablePositions.map(pos => [pos.name, pos]));
  // Determine number of positions to offer
  const numToOffer = calculatePositionsToOffer(playerPercentage, availablePositions, leadPercentage);

  // Offer positions based on party's priorities and availability
  let offeredPositions: string[] = [];
  const offeredSet = new Set<string>();
  for (const pos of priorityPositions) {
    if (offeredPositions.length >= numToOffer) break;
    const found = availableByName.get(pos);
    if (found && found.available_slots > 0) {
      offeredPositions.push(pos);
      offeredSet.add(pos);
    }
  }
  // If not enough, fill with any available positions
  for (const pos of availablePositions) {
    if (offeredPositions.length >= numToOffer) break;
    if (!offeredSet.has(pos.name)) {
      offeredPositions.push(pos.name);
      offeredSet.add(pos.name);
    }
  }

  const totalImportance = offeredPositions.reduce((sum, pos) => {
    const position = availableByName.get(pos);
    return sum + (position?.importance || 10);
  }, 0);

  // Generate questions for the player
  const questions = [];
  const question1 = generateCoalitionPolicyQuestion(leadParty, playerParty);
  if (question1) questions.push(question1);

  const question2 = generateCoalitionPolicyQuestion(playerParty, leadParty);
  if (question2 && question2.topic !== question1?.topic) questions.push(question2);

  return {
    message: `${leadParty.party} is forming a coalition and would like ${playerParty.party} to join.`,
    offeredPositions,
    totalImportance,
    questions
  };
}

/**
 * Gate-check: should the AI (leadParty) bother approaching the player?
 *
 * We simulate the scenario as if it were REVERSED — the player is the one
 * leading and offering ALL available cabinet positions to the AI (a maximally
 * generous offer), plus a `desperationBoost` to account for the AI being
 * somewhat more open to coalition than a cold calculation would suggest.
 *
 * If the AI wouldn't accept even that generous a deal, it won't approach.
 */
export function shouldAIApproachPlayer(
  leadParty: Candidate,        // the AI party considering making an offer
  playerParty: Candidate,      // the player being considered as partner
  leadPercentage: number,
  playerPercentage: number,
  allocations: Record<string, string[]>,
  desperationBoost: number = 20  // extra points to make the AI slightly more likely to reach out
): boolean {
  // Total importance of ALL available cabinet positions (most generous offer possible)
  const availablePositions = getAvailableCabinetPositions(allocations);
  const totalImportance = availablePositions.reduce((sum, pos) => sum + pos.importance * pos.available_slots, 0);

  // Reversed: player is lead, AI (leadParty) is the partner being considered
  const compatibility = calculatePartyCompatibility(leadParty, playerParty);
  let baseWillingness = compatibility;

  // Adjust based on player's strength (the "lead" in the reversed scenario)
  if (playerPercentage > 40) {
    baseWillingness += 5;
  } else if (playerPercentage > 30) {
    baseWillingness += 2;
  } else {
    baseWillingness -= 10;
  }

  // Adjust based on AI party's strength (the "partner" in the reversed scenario)
  if (leadPercentage > 15) {
    baseWillingness -= 10;
  } else if (leadPercentage < 5) {
    baseWillingness += 5;
  }

  // Cabinet appeal for the AI party receiving ALL positions
  const cabinetAppeal = calculateCabinetAppeal(totalImportance, leadPercentage, compatibility);

  const willingness = Math.max(0, Math.min(100, baseWillingness + cabinetAppeal + desperationBoost));

  if (DEBUG) {
    console.log('DEBUG: shouldAIApproachPlayer', {
      leadParty: leadParty.party,
      playerParty: playerParty.party,
      compatibility,
      baseWillingness,
      totalImportance,
      cabinetAppeal,
      desperationBoost,
      willingness,
      wouldApproach: willingness >= 50
    });
  }

  // Only approach the player if even the most generous reversed offer clears the bar
  return willingness >= 50;
}

export function evaluatePlayerResponse(
  leadParty: Candidate,
  playerParty: Candidate,
  leadPercentage: number,
  playerPercentage: number,
  policyResponses: number[],
  acceptedPositions: string[],
  allocations: Record<string, string[]>,
  offeredImportance: number = 0
): {
  success: boolean;
  message: string;
  finalAppeal: number;
  greedPenalty: number;
  compatibility: number;
} {
  const availablePositions = getAvailableCabinetPositions(allocations);
  const availableByName = new Map(availablePositions.map(pos => [pos.name, pos]));
  let acceptedImportance = acceptedPositions.reduce((sum, pos) => {
    const position = availableByName.get(pos);
    return sum + (position?.importance || 10);
  }, 0);

  // Compare accepted importance against expected importance
  const totalCabinetSlots = availablePositions.reduce((sum, pos) => sum + pos.available_slots, 0);
  const combinedPercentage = leadPercentage + playerPercentage;
  const expectedSlots = Math.max(1, Math.round((playerPercentage / combinedPercentage) * totalCabinetSlots));
  // Crude estimate: average importance per slot might be 12
  const expectedImportance = expectedSlots * 12;

  // If player demanded way more than expected, or gave terrible policy answers, penalize heavily.
  const policyScore = policyResponses.reduce((sum, r) => sum + r, 0);
  // Don't penalize greed if they just accepted exactly what they were offered (or less)
  const greedThreshold = Math.max(expectedImportance, offeredImportance) * 1.5;
  const greedPenalty = acceptedImportance > greedThreshold ? -25 : 0;

  const compatibility = calculatePartyCompatibility(leadParty, playerParty);
  let baseWillingness = compatibility;
  if (leadPercentage > 40) baseWillingness += 10;
  else if (leadPercentage < 25) baseWillingness -= 15;

  const compatibilityFactor = compatibility !== 0 ? Math.max(0, compatibility / 100) : 0;
  // AI is essentially determining if the player's counter-offer is acceptable to them.
  // The lead party loses appeal if they have to give away too much.
  // But if you are accepting what they offered, there shouldn't be much of a giveaway penalty.
  const extraCabinetTaken = Math.max(0, acceptedImportance - offeredImportance);
  const cabinetGiveawayPenalty = -1 * (extraCabinetTaken * 0.5);

  // They gain appeal from good policy answers
  const scaledAppeal = (policyScore + cabinetGiveawayPenalty + greedPenalty) * compatibilityFactor;

  // Add an RNG factor between -15 and +15 to introduce uncertainty
  const rngFactor = (Math.random() * 30) - 15;

  // Final score is the base willingness + the net appeal of the deal + RNG
  // But wait, if they initiated the offer, they were already at ~100 willingness to work with the player.
  // We should just check if the player's demands ruined that willingness.
  const finalAppeal = 100 + scaledAppeal + rngFactor;

  if (DEBUG) {
    console.log('DEBUG: evaluatePlayerResponse', {
      leadParty: leadParty.party,
      playerParty: playerParty.party,
      expectedImportance,
      acceptedImportance,
      policyScore,
      greedPenalty,
      rngFactor,
      finalAppeal
    });
  }

  let message = '';
  if (finalAppeal >= 85) {
    message = `${leadParty.party} leadership agreed to your terms and has welcomed you into the coalition!`;
  } else if (finalAppeal >= 60) {
    message = `${leadParty.party} expressed some reservations about your demands, but ultimately agreed to form the coalition.`;
  } else if (finalAppeal > 40) {
    message = `Talks broke down. ${leadParty.party} felt you were asking for too much relative to your mandate.`;
  } else if (greedPenalty < 0) {
    message = `${leadParty.party} angrily rejected your greedy demands and laughed you out of the room.`;
  } else {
    const biggestDiff = getBiggestPolicyDifference(leadParty, playerParty);
    message = `${leadParty.party} completely refused, citing insurmountable differences on ${biggestDiff}.`;
  }

  return {
    success: finalAppeal >= 60,
    message,
    finalAppeal,
    greedPenalty,
    compatibility
  };
}

/**
 * Auto-allocate any unfilled cabinet positions (except multi-slot Junior Ministers)
 * to the lead party. Modifies the allocations object in-place.
 * @param allocations Current allocations: { [position]: [party ids] }
 * @param leadPartyId The id of the lead party
 */
export function autoAllocateUnfilledCabinetPositions(
  allocations: Record<string, string[]>,
  leadPartyId: string
): void {
  for (const [position, details] of Object.entries(CABINET_POSITIONS)) {

    const allocated = allocations[position] || [];
    const unfilledSlots = details.max_slots - allocated.length;
    if (unfilledSlots > 0) {
      // Fill all unallocated slots with the lead party
      allocations[position] = [
        ...allocated,
        ...Array(unfilledSlots).fill(leadPartyId)
      ];
    }
  }
}

// ─── Counter-Offer Types ─────────────────────────────────────────────────────

export interface CounterDemand {
  type: 'position_add' | 'policy_concession';
  /** Position name (e.g. 'Defence') or policy description */
  detail: string;
  importance: 'must' | 'would_help';
}

// ─── Dynamic Programming: Optimal Coalition Finder ───────────────────────────

export interface OptimalCoalition {
  partners: Candidate[];
  totalPercentage: number;
  avgWillingness: number;
  minCompatibility: number;
  ideologicalCoherence: number;
}

export function findOptimalCoalitions(
  leadParty: Candidate,
  availablePartners: Candidate[],
  results: Array<{ candidate: Candidate; percentage: number }>,
  maxResults: number = 3
): OptimalCoalition[] {
  const resultsById = new Map(results.map(r => [r.candidate.id, r.percentage]));
  const leadPct = resultsById.get(leadParty.id) || 0;

  if (leadPct >= 50) return []; // No coalition needed

  const partners = availablePartners.filter(p => p.id !== leadParty.id);
  if (partners.length === 0) return [];

  // Generate all subsets of partners (power set)
  const subsets: Candidate[][] = [];
  const n = partners.length;
  const totalSubsets = 1 << n;
  for (let mask = 1; mask < totalSubsets; mask++) {
    const subset: Candidate[] = [];
    let totalPct = leadPct;
    for (let bit = 0; bit < n; bit++) {
      if (mask & (1 << bit)) {
        subset.push(partners[bit]);
        totalPct += (resultsById.get(partners[bit].id) || 0);
      }
    }
    if (totalPct >= 50) {
      subsets.push(subset);
    }
  }

  // Score each viable combination
  const scored: OptimalCoalition[] = subsets.map(subset => {
    let totalWillingness = 0;
    let minCompat = Infinity;
    let totalWeight = 0;
    const allParties = [leadParty, ...subset];

    for (const p of allParties) {
      const pct = resultsById.get(p.id) || 0;
      totalWeight += pct;
      for (const q of allParties) {
        if (p.id >= q.id) continue;
        const compat = calculatePartyCompatibility(p, q);
        const willing = calculateCoalitionWillingness(leadParty, p, leadPct, resultsById.get(p.id) || 0);
        totalWillingness += willing * pct;
        if (compat < minCompat) minCompat = compat;
      }
    }

    const avgWillingness = totalWeight > 0 ? totalWillingness / totalWeight : 0;
    const ideologicalCoherence = allParties.reduce((sum, p) => {
      const compat = calculatePartyCompatibility(leadParty, p);
      return sum + compat;
    }, 0) / allParties.length;

    const totalPercentage = leadPct + subset.reduce((s, p) => s + (resultsById.get(p.id) || 0), 0);

    return { partners: subset, totalPercentage, avgWillingness, minCompatibility: minCompat === Infinity ? 0 : minCompat, ideologicalCoherence };
  });

  // Sort by: highest avgWillingness, then highest ideologicalCoherence, then most partners (prefer broader coalitions)
  scored.sort((a, b) => {
    if (Math.abs(b.avgWillingness - a.avgWillingness) > 3) return b.avgWillingness - a.avgWillingness;
    if (Math.abs(b.ideologicalCoherence - a.ideologicalCoherence) > 2) return b.ideologicalCoherence - a.ideologicalCoherence;
    return b.partners.length - a.partners.length;
  });

  return scored.slice(0, maxResults);
}

// ─── Counter-Offer Engine ─────────────────────────────────────────────────────

export function generateCounterDemands(
  leadParty: Candidate,
  partnerParty: Candidate,
  offeredPositions: string[],
  cabinetAllocations: Record<string, string[]>,
  finalAppeal: number
): CounterDemand[] {
  const demands: CounterDemand[] = [];
  const priorityPositions = getPartyPriorityPositions(partnerParty);
  const availablePositions = getAvailableCabinetPositions(cabinetAllocations);

  // Partner demands positions they wanted but weren't offered
  const unmetPriorities = priorityPositions.filter(p => !offeredPositions.includes(p));
  for (const pos of unmetPriorities.slice(0, 2)) {
    const isAvailable = availablePositions.some(ap => ap.name === pos);
    if (isAvailable) {
      demands.push({
        type: 'position_add',
        detail: pos,
        importance: unmetPriorities.indexOf(pos) === 0 ? 'must' : 'would_help'
      });
    }
  }

  // If no position demands or appeal is quite low, add a policy demand
  if (demands.length === 0 || finalAppeal < 70) {
    const policyQ = generateCoalitionPolicyQuestion(leadParty, partnerParty);
    if (policyQ) {
      // Demand that the lead concede toward the partner's preferred option
      const partnerPref = policyQ.options.reduce((best, o) =>
        o.appeal > (best?.appeal || -Infinity) ? o : best, policyQ.options[0]);
      demands.push({
        type: 'policy_concession',
        detail: `${policyQ.topic}: ${partnerPref.text}`,
        importance: finalAppeal < 50 ? 'must' : 'would_help'
      });
    }
  }

  // If appeal is very close to success, just one small demand
  if (finalAppeal >= 80 && demands.length > 1) {
    return demands.slice(0, 1);
  }

  return demands;
}

export function evaluateCounterResponse(
  leadParty: Candidate,
  partnerParty: Candidate,
  leadPercentage: number,
  partnerPercentage: number,
  acceptedDemands: CounterDemand[],
  counterDemands: CounterDemand[],
  baseAppeal: number,
  policyResponses: number[]
): { success: boolean; message: string; finalAppeal: number } {
  const compatibility = calculatePartyCompatibility(leadParty, partnerParty);

  let appealBoost = 0;
  const totalMusts = counterDemands.filter(d => d.importance === 'must').length;
  const acceptedMusts = acceptedDemands.filter(d => d.importance === 'must').length;

  if (totalMusts > 0) {
    // Must accept all "must" demands for any chance
    if (acceptedMusts === totalMusts) {
      appealBoost += 20;
    } else {
      appealBoost -= 30;
    }
  }

  // Bonus for accepting "would_help" demands
  const acceptedHelps = acceptedDemands.filter(d => d.importance === 'would_help').length;
  appealBoost += acceptedHelps * 8;

  // Penalty for ignoring demands
  const ignoredCount = counterDemands.length - acceptedDemands.length;
  appealBoost -= ignoredCount * 10;

  // Policy response bonus
  const policyScore = policyResponses.reduce((sum, r) => sum + r, 0);
  appealBoost += policyScore * 0.3;

  const rngFactor = (Math.random() * 20) - 10;
  const finalAppeal = baseAppeal + appealBoost + rngFactor;

  let message = '';
  if (finalAppeal >= 90) {
    const opts = [
      `${partnerParty.party} accepts your counter-offer and agrees to join the coalition.`,
      `${partnerParty.party} leadership approves the revised terms — coalition achieved.`,
      `After reviewing your counter-proposal, ${partnerParty.party} is satisfied and will join.`
    ];
    message = opts[Math.floor(Math.random() * opts.length)];
  } else if (finalAppeal >= 65) {
    const opts = [
      `${partnerParty.party} is still not fully satisfied with the revised terms but is willing to continue negotiating.`,
      `${partnerParty.party} sees some movement but wants further concessions.`,
      `Progress has been made, but ${partnerParty.party} wants more before committing.`
    ];
    message = opts[Math.floor(Math.random() * opts.length)];
  } else {
    const biggestDiff = getBiggestPolicyDifference(leadParty, partnerParty);
    const opts = [
      `${partnerParty.party} rejects your counter-offer, citing irreconcilable differences on ${biggestDiff}.`,
      `Talks have collapsed. ${partnerParty.party} refuses to compromise further on ${biggestDiff}.`,
      `${partnerParty.party} walks away from the table — your counter-offer was deemed insufficient.`
    ];
    message = opts[Math.floor(Math.random() * opts.length)];
  }

  return { success: finalAppeal >= 80, message, finalAppeal };
}
