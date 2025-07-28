import { Candidate, CABINET_POSITIONS, VALUES } from '@/types/game';

export interface CoalitionCompatibility {
  candidate: Candidate;
  percentage: number;
  compatibility: number;
  appeal: number;
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
    compatibility -= 20;
  }
  // Clamp to [0, 100]
  compatibility = Math.max(0, Math.min(100, compatibility));
  console.log('DEBUG: calculatePartyCompatibility', { party1: party1.party, party2: party2.party, compatibility });
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
    baseWillingness -= 20;
  } else if (compatibility < 60) {
    baseWillingness -= 10;
  }

  // Adjust based on lead party's strength
  if (leadPercentage > 40) {
    baseWillingness += 10; // Attractive to join strong party
  } else if (leadPercentage > 30) {
    baseWillingness += 5;
  } else {
    baseWillingness -= 10; // Risky to join weak party
  }
  
  // Adjust based on partner's strength
  if (partnerPercentage > 15) {
    baseWillingness -= 5; // Larger parties are harder to convince
  } else if (partnerPercentage < 5) {
    baseWillingness += 10; // Smaller parties are more willing
  }
  
  // Cabinet position appeal
  const cabinetAppeal = calculateCabinetAppeal(cabinetImportanceOffered, partnerPercentage, compatibility);
  const willingness = Math.max(0, Math.min(100, baseWillingness + cabinetAppeal));
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
  return willingness;
}

export function calculateCabinetAppeal(
  importanceOffered: number,
  partnerPercentage: number,
  compatibility: number
): number {
  if (importanceOffered === 0) return -20; // Penalty for no positions
  
  let appeal = importanceOffered * 1.5;
  
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
  
  return Math.max(-30, Math.min(50, appeal));
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
  // soc_cap (socialist-capitalist): index 3
  if (vals[3] < -30) {
    priorities.push('Finance Minister', 'Junior Minister');
  } else if (vals[3] > 30) {
    priorities.push('Finance Minister', 'Transport Minister');
  }
  
  // env_eco (environmental-economic): index 2
  if (vals[2] < -20) {
    priorities.push('Environment Minister');
  }
  
  // pac_mil (pacifist-militarist): index 4
  if (vals[4] < -30) {
    priorities.push('Foreign Minister');
  } else if (vals[4] > 30) {
    priorities.push('Defense Minister');
  }
  
  // prog_cons (progressive-conservative): index 0
  if (vals[0] < -20) {
    priorities.push('Education Minister', 'Health Minister');
  } else if (vals[0] > 20) {
    priorities.push('Home/Interior Minister', 'Justice Minister');
  }
  
  // Default fallback positions
  if (priorities.length === 0) {
    priorities.push('Junior Minister', 'Parliamentary Secretary');
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

  const finalAppeal = baseWillingness + scaledAppeal;

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
    finalAppeal
  });
  
  if (finalAppeal > 60) {
    return {
      success: true,
      message: `${partnerParty.party} enthusiastically agrees to join the coalition!`,
      finalAppeal
    };
  } else if (finalAppeal > 40) {
    return {
      success: true,
      message: `${partnerParty.party} agrees to join the coalition after careful consideration.`,
      finalAppeal
    };
  } else if (finalAppeal > 20) {
    return {
      success: false,
      message: `${partnerParty.party} is interested but requires better terms.`,
      finalAppeal
    };
  } else {
    return {
      success: false,
      message: `${partnerParty.party} declines to join the coalition.`,
      finalAppeal
    };
  }
}

export function findBestCoalitionPartners(
  leadParty: Candidate,
  availableParties: Candidate[],
  results: Array<{ candidate: Candidate; percentage: number }>
): Array<{ candidate: Candidate; compatibility: number; willingness: number; percentage: number }> {
  const leadResult = results.find(r => r.candidate.id === leadParty.id);
  const leadPercentage = leadResult?.percentage || 0;
  
  return availableParties
    .map(party => {
      const result = results.find(r => r.candidate.id === party.id);
      const percentage = result?.percentage || 0;
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

// Helper: Calculate number of positions to offer based on vote share and available positions
function calculatePositionsToOffer(
  partnerPercentage: number,
  availablePositions: { name: string; importance: number; available_slots: number }[],
  totalCabinetSlots: number
): number {
  // Offer at least 1, but scale up so most positions are filled
  // E.g. if partner has 20% of vote and 15 slots, offer ~3
  const minOffer = 1;
  const scaled = Math.round((partnerPercentage / 100) * totalCabinetSlots);
  return Math.max(minOffer, scaled);
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
} {
  const compatibility = calculatePartyCompatibility(leadParty, partnerParty);
  const priorityPositions = getPartyPriorityPositions(partnerParty);
  const availablePositions = getAvailableCabinetPositions(allocations);

  // Calculate total available cabinet slots
  const totalCabinetSlots = availablePositions.reduce((sum, pos) => sum + pos.available_slots, 0);

  // Determine number of positions to offer
  const numToOffer = calculatePositionsToOffer(partnerPercentage, availablePositions, totalCabinetSlots);

  // Offer positions based on party's priorities and availability
  let positionsToOffer: string[] = [];
  for (const pos of priorityPositions) {
    if (positionsToOffer.length >= numToOffer) break;
    const found = availablePositions.find(ap => ap.name === pos && ap.available_slots > 0);
    if (found) positionsToOffer.push(pos);
  }
  // If not enough, fill with any available positions
  for (const pos of availablePositions) {
    if (positionsToOffer.length >= numToOffer) break;
    if (!positionsToOffer.includes(pos.name)) positionsToOffer.push(pos.name);
  }

  const totalImportance = positionsToOffer.reduce((sum, pos) => {
    const position = availablePositions.find(p => p.name === pos);
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
  console.log('DEBUG: simulateAICoalitionNegotiation', {
    leadParty: leadParty.party,
    partnerParty: partnerParty.party,
    leadPercentage,
    partnerPercentage,
    positionsToOffer,
    totalImportance,
    policyResponses
  });

  return {
    success: result.success,
    cabinetPositions: result.success ? positionsToOffer : [],
    message: result.message
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

  // Calculate total available cabinet slots
  const totalCabinetSlots = availablePositions.reduce((sum, pos) => sum + pos.available_slots, 0);

  // Determine number of positions to offer
  const numToOffer = calculatePositionsToOffer(playerPercentage, availablePositions, totalCabinetSlots);

  // Offer positions based on party's priorities and availability
  let offeredPositions: string[] = [];
  for (const pos of priorityPositions) {
    if (offeredPositions.length >= numToOffer) break;
    const found = availablePositions.find(ap => ap.name === pos && ap.available_slots > 0);
    if (found) offeredPositions.push(pos);
  }
  // If not enough, fill with any available positions
  for (const pos of availablePositions) {
    if (offeredPositions.length >= numToOffer) break;
    if (!offeredPositions.includes(pos.name)) offeredPositions.push(pos.name);
  }

  const totalImportance = offeredPositions.reduce((sum, pos) => {
    const position = availablePositions.find(p => p.name === pos);
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

export function evaluatePlayerResponse(
  leadParty: Candidate,
  playerParty: Candidate,
  leadPercentage: number,
  playerPercentage: number,
  policyResponses: number[],
  acceptedPositions: string[],
  allocations: Record<string, string[]>
): {
  success: boolean;
  message: string;
  finalAppeal: number;
} {
  const availablePositions = getAvailableCabinetPositions(allocations);
  const acceptedImportance = acceptedPositions.reduce((sum, pos) => {
    const position = availablePositions.find(p => p.name === pos);
    return sum + (position?.importance || 10);
  }, 0);

  console.log('DEBUG: evaluatePlayerResponse', {
    leadParty: leadParty.party,
    playerParty: playerParty.party,
    leadPercentage,
    playerPercentage,
    policyResponses,
    acceptedPositions,
    acceptedImportance
  });

  return simulateCoalitionNegotiation(
    leadParty,
    playerParty,
    leadPercentage,
    playerPercentage,
    acceptedImportance,
    policyResponses
  );
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
    // Skip multi-slot Junior Ministers
    if (position === 'Junior Minister' && details.max_slots > 1) continue;
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
