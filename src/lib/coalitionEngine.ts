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
  
  // Convert to compatibility score (0-100, higher = more compatible)
  const maxPossibleDistance = VALUES.length * 200; // Max if parties are at opposite extremes
  const compatibility = 100 - (totalDistance / maxPossibleDistance * 100);
  return Math.max(0, Math.min(100, compatibility));
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
  
  return Math.max(0, Math.min(100, baseWillingness + cabinetAppeal));
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
  
  const finalAppeal = baseWillingness + cabinetAppeal + policyAppeal;
  
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
