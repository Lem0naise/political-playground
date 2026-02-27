import { VALUES } from '@/types/game';

export interface Party {
  party: string;
  name: string;
  colour: string;
  poll_percentage?: number;
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
    ...selectedLeader,
    party: newName,
    name: selectedLeader.name,
    colour: selectedLeader.colour,
    poll_percentage: (party1.poll_percentage || 0) + (party2.poll_percentage || 0),
    ...mergedValues,
    swing: selectedLeader.swing || 0,
    merged: true,
    originalParties: [party1.party, party2.party]
  };
}

// ─── Ideology-aware name generation ───────────────────────────────────────────

/**
 * Word banks keyed by axis and direction. Entries are [adjective, noun] pairs.
 * Negative axis value = left of axis label, positive = right.
 */
const IDEOLOGY_WORDS: Record<string, { negative: [string, string][]; positive: [string, string][] }> = {
  prog_cons: {
    negative: [
      ['Progressive', 'Front'],
      ['Reform', 'Movement'],
      ['New', 'Democrats'],
      ['Liberal', 'Alliance'],
      ['Forward', 'Coalition'],
      ['Modern', 'League'],
    ],
    positive: [
      ['Conservative', 'Party'],
      ['Traditional', 'Alliance'],
      ['Heritage', 'Union'],
      ['Civic', 'Order'],
      ['National', 'Covenant'],
      ['Unity', 'Front'],
    ],
  },
  nat_glob: {
    negative: [
      ['National', 'Alliance'],
      ['Patriot', 'Front'],
      ['Sovereign', 'League'],
      ['Homeland', 'Movement'],
      ['Republican', 'Guard'],
      ['Independence', 'Party'],
    ],
    positive: [
      ['International', 'Democrats'],
      ['Open', 'Alliance'],
      ['Cosmopolitan', 'League'],
      ['Global', 'Forum'],
      ['Unity', 'Pact'],
      ['Civic', 'Union'],
    ],
  },
  env_eco: {
    negative: [
      ['Green', 'Party'],
      ['Ecology', 'Alliance'],
      ['Earth', 'Front'],
      ['Sustainable', 'League'],
      ['Environmental', 'Union'],
      ['Climate', 'Coalition'],
    ],
    positive: [
      ['Growth', 'Alliance'],
      ['Prosperity', 'Party'],
      ['Enterprise', 'Front'],
      ['Industrial', 'League'],
      ['Development', 'Union'],
      ['Commerce', 'Coalition'],
    ],
  },
  soc_cap: {
    negative: [
      ["People's", 'Party'],
      ['Democratic', 'Front'],
      ['Labour', 'Alliance'],
      ['Workers', 'League'],
      ['Social', 'Democrats'],
      ['Solidarity', 'Union'],
    ],
    positive: [
      ['Free Market', 'Alliance'],
      ['Enterprise', 'Party'],
      ['Liberty', 'Union'],
      ['Economic', 'League'],
      ['Capital', 'Forum'],
      ['Opportunity', 'Front'],
    ],
  },
  pac_mil: {
    negative: [
      ['Peace', 'Alliance'],
      ['Civic', 'Front'],
      ['Concord', 'League'],
      ['Harmony', 'Union'],
      ['Reconciliation', 'Party'],
      ['Accord', 'Coalition'],
    ],
    positive: [
      ['Defence', 'Alliance'],
      ['Security', 'Front'],
      ['Strength', 'League'],
      ['Shield', 'Coalition'],
      ['Sentinel', 'Party'],
      ['Guard', 'Union'],
    ],
  },
  auth_ana: {
    negative: [
      ['Order', 'Alliance'],
      ['Authority', 'Front'],
      ['Structured', 'League'],
      ['Constitutional', 'Order'],
      ['Governance', 'Union'],
      ['Discipline', 'Party'],
    ],
    positive: [
      ['Liberty', 'Front'],
      ['Freedom', 'Alliance'],
      ['Autonomous', 'League'],
      ['Civil', 'Union'],
      ['Liberation', 'Party'],
      ['Individual', 'Coalition'],
    ],
  },
  rel_sec: {
    negative: [
      ['Faith', 'Alliance'],
      ['Christian', 'Democrats'],
      ['Moral', 'League'],
      ['Tradition', 'Party'],
      ['Values', 'Union'],
      ['Covenant', 'Front'],
    ],
    positive: [
      ['Secular', 'Alliance'],
      ['Rational', 'Democrats'],
      ['Civic', 'League'],
      ['Scientific', 'Party'],
      ['Enlightenment', 'Union'],
      ['Reason', 'Coalition'],
    ],
  },
};

const STRUCTURAL_SUFFIXES = [
  'Party',
  'Alliance',
  'Front',
  'Union',
  'League',
  'Movement',
  'Coalition',
  'Democrats',
  'Forum',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate ideology-aware name suggestions for two merging parties.
 * Produces 8-10 varied, realistic names seeded from the averaged political values.
 */
export function generateMergedPartyNames(party1: Party, party2: Party): string[] {
  // Average the political values
  const avgVals: Record<string, number> = {};
  for (const key of VALUES) {
    const v1 = party1[key] ?? 0;
    const v2 = party2[key] ?? 0;
    avgVals[key] = (v1 + v2) / 2;
  }

  // Find top 3 dominant axes (by absolute value)
  const ranked = VALUES
    .map(key => ({ key, abs: Math.abs(avgVals[key] ?? 0) }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 3);

  // Collect ideology words from dominant axes
  const ideologyPairs: [string, string][] = [];
  for (const { key, abs } of ranked) {
    if (abs < 20) continue; // Ignore near-neutral axes
    const bank = IDEOLOGY_WORDS[key];
    if (!bank) continue;
    const direction = (avgVals[key] ?? 0) < 0 ? 'negative' : 'positive';
    ideologyPairs.push(...bank[direction]);
  }

  const suggestions: string[] = [];

  // Strategy A: adjective + noun from ideology banks (shuffled for RNG)
  const shuffledPairs = shuffle(ideologyPairs);
  for (const [adj, noun] of shuffledPairs.slice(0, 5)) {
    suggestions.push(`${adj} ${noun}`);
  }

  // Strategy B: mix adjective from one axis + noun from another
  if (shuffledPairs.length >= 2) {
    for (let i = 0; i < 3; i++) {
      const { 0: adj } = shuffledPairs[i % shuffledPairs.length];
      const { 1: noun } = shuffledPairs[(i + 1) % shuffledPairs.length];
      const candidate = `${adj} ${noun}`;
      if (!suggestions.includes(candidate)) suggestions.push(candidate);
    }
  }

  // Strategy C: significant word from each party name + suffix
  const getSignificantWord = (name: string): string => {
    const stopwords = new Set(['the', 'and', 'of', 'for', 'a', 'an', 'in', 'on']);
    const words = name.split(/\s+/).filter(w => !stopwords.has(w.toLowerCase()) && w.length > 2);
    return words.sort((a, b) => b.length - a.length)[0] || name.split(' ')[0];
  };
  const w1 = getSignificantWord(party1.party);
  const w2 = getSignificantWord(party2.party);
  const suffix = pick(STRUCTURAL_SUFFIXES);
  if (w1 !== w2) {
    suggestions.push(`${w1} ${w2} ${suffix}`);
    suggestions.push(`United ${w1} ${suffix}`);
  } else {
    suggestions.push(`United ${w1} ${suffix}`);
  }

  // Strategy D: prefix + ideology noun
  const prefixes = ['United', 'New', 'Democratic', 'Progressive', 'National', 'Popular'];
  if (shuffledPairs.length > 0) {
    const { 1: noun } = shuffledPairs[0];
    suggestions.push(`${pick(prefixes)} ${noun}`);
  }

  // Deduplicate and return up to 10
  return Array.from(new Set(suggestions.filter(Boolean))).slice(0, 10);
}
