import { VALUES } from '@/types/game';

export interface Party {
  party: string;
  name: string;
  colour: string;
  party_pop: number;
  [key: string]: any;
}

export interface MergeCandidate {
  party1: Party;
  party2: Party;
  similarityScore: number;
}

export function calculateIdeologySimilarity(party1: Party, party2: Party): number {
  const ideologyKeys = VALUES;
  let totalSimilarity = 0;
  let validComparisons = 0;

  for (const key of ideologyKeys) {
    if (party1[key] !== undefined && party2[key] !== undefined) {
      const diff = Math.abs(party1[key] - party2[key]);
      totalSimilarity += (100 - diff) / 100;
      validComparisons++;
    }
  }

  return validComparisons > 0 ? totalSimilarity / validComparisons : 0;
}

export function findMergeCandidates(parties: Party[], threshold: number = 0.7): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  
  for (let i = 0; i < parties.length; i++) {
    for (let j = i + 1; j < parties.length; j++) {
      const similarity = calculateIdeologySimilarity(parties[i], parties[j]);
      if (similarity >= threshold) {
        candidates.push({
          party1: parties[i],
          party2: parties[j],
          similarityScore: similarity
        });
      }
    }
  }

  return candidates.sort((a, b) => b.similarityScore - a.similarityScore);
}

export function mergeParties(party1: Party, party2: Party, newName: string, selectedLeader: Party): Party {
  // Calculate averaged political values
  const mergedValues: Record<string, number> = {};
  for (const key of VALUES) {
    if (party1[key] !== undefined && party2[key] !== undefined) {
      mergedValues[key] = Math.round((party1[key] + party2[key]) / 2);
    } else if (party1[key] !== undefined) {
      mergedValues[key] = party1[key];
    } else if (party2[key] !== undefined) {
      mergedValues[key] = party2[key];
    }
  }

  return {
    ...selectedLeader, // Start with the selected leader's properties
    party: newName,
    name: selectedLeader.name,
    colour: selectedLeader.colour,
    party_pop: party1.party_pop + party2.party_pop,
    ...mergedValues, // Override with merged political values
    swing: selectedLeader.swing || 0,
    merged: true,
    originalParties: [party1.party, party2.party]
  };
}
