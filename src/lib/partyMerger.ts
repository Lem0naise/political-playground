import { VALUES, PoliticalValues } from '@/types/game';

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

const STOPWORDS = new Set(['the', 'and', 'of', 'for', 'a', 'an', 'in', 'on', 'to', 'is', 'by', 'or', 'no', 'not', 'new']);
const STRUCTURAL_WORDS = new Set(STRUCTURAL_SUFFIXES.map(s => s.toLowerCase()));

function extractSignificantWords(name: string): string[] {
  return name.split(/[\s-]+/).filter(w => {
    const lower = w.toLowerCase();
    return !STOPWORDS.has(lower) && w.length > 1;
  });
}

function extractCoreWords(name: string): string[] {
  return extractSignificantWords(name).filter(w => !STRUCTURAL_WORDS.has(w.toLowerCase()));
}

function longestWord(words: string[]): string | null {
  return words.length > 0 ? words.reduce((a, b) => a.length >= b.length ? a : b) : null;
}

/**
 * Generate ideology-aware name suggestions for two merging parties.
 * Produces up to 10 varied, realistic names seeded from averaged political values
 * and actual word combinations from both party names.
 */
export function generateMergedPartyNames(party1: Party, party2: Party): string[] {
  const avgVals: Record<string, number> = {};
  for (const key of VALUES) {
    const v1 = party1[key] ?? 0;
    const v2 = party2[key] ?? 0;
    avgVals[key] = (v1 + v2) / 2;
  }

  const ranked = VALUES
    .map(key => ({ key, abs: Math.abs(avgVals[key] ?? 0) }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 3);

  const ideologyPairs: [string, string][] = [];
  for (const { key, abs } of ranked) {
    if (abs < 20) continue;
    const bank = IDEOLOGY_WORDS[key];
    if (!bank) continue;
    const direction = (avgVals[key] ?? 0) < 0 ? 'negative' : 'positive';
    ideologyPairs.push(...bank[direction]);
  }

  const suggestions: string[] = [];

  // Strategy A: adjective + noun from ideology banks (up to 3)
  const shuffledPairs = shuffle(ideologyPairs);
  for (const [adj, noun] of shuffledPairs.slice(0, 3)) {
    suggestions.push(`${adj} ${noun}`);
  }

  // Strategy B: cross-mix adjective from one axis + noun from another (up to 2)
  if (shuffledPairs.length >= 2) {
    for (let i = 0; i < 2; i++) {
      const { 0: adj } = shuffledPairs[i % shuffledPairs.length];
      const { 1: noun } = shuffledPairs[(i + 1) % shuffledPairs.length];
      const candidate = `${adj} ${noun}`;
      if (!suggestions.includes(candidate)) suggestions.push(candidate);
    }
  }

  // Strategy C: combine actual words from both party names
  const core1 = extractCoreWords(party1.party);
  const core2 = extractCoreWords(party2.party);
  const lw1 = longestWord(core1);
  const lw2 = longestWord(core2);
  const suffix = pick(STRUCTURAL_SUFFIXES);

  if (lw1 && lw2 && lw1.toLowerCase() !== lw2.toLowerCase()) {
    // Direct combination: "Liberal Democrats"
    suggestions.push(`${lw1} ${lw2}`);
    // With suffix: "Liberal Democrats Alliance"
    if (!lw2.toLowerCase().endsWith('s')) {
      suggestions.push(`${lw1} ${lw2} ${suffix}`);
    }
    // Reversed: "Democratic Liberal Party"
    suggestions.push(`${lw2} ${lw1} ${suffix}`);
    // United prefix
    suggestions.push(`United ${lw1} ${suffix}`);

    // Combine all core words from both sides
    const allCore = [...core1, ...core2].filter((w, i, arr) =>
      arr.indexOf(w) === i && w.toLowerCase() !== (lw1?.toLowerCase()) && w.toLowerCase() !== (lw2?.toLowerCase())
    );
    if (allCore.length > 0) {
      const extra = longestWord(allCore);
      if (extra) suggestions.push(`${lw1} ${lw2} ${extra}`);
    }
  } else if (lw1) {
    suggestions.push(`United ${lw1} ${suffix}`);
    const otherCore = lw2 || (core2.length > 0 ? core2[0] : null);
    if (otherCore && otherCore.toLowerCase() !== lw1.toLowerCase()) {
      suggestions.push(`${lw1} ${otherCore} ${suffix}`);
    }
  }

  // Strategy D: prefix + ideology noun (up to 2)
  const prefixes = ['United', 'New', 'Democratic', 'National', 'Popular'];
  if (shuffledPairs.length > 0) {
    for (let i = 0; i < 2; i++) {
      const { 1: noun } = shuffledPairs[i % shuffledPairs.length];
      const pref = prefixes[(i + Math.floor(Math.random() * prefixes.length)) % prefixes.length];
      suggestions.push(`${pref} ${noun}`);
    }
  }

  // Strategy E: ideology adjective + core party word
  if (shuffledPairs.length > 0 && lw1) {
    const { 0: adj } = shuffledPairs[0];
    suggestions.push(`${adj} ${lw1} ${suffix}`);
  }
  if (shuffledPairs.length > 0 && lw2 && lw2.toLowerCase() !== (lw1?.toLowerCase() || '')) {
    const { 0: adj } = shuffledPairs[shuffledPairs.length > 1 ? 1 : 0];
    suggestions.push(`${adj} ${lw2} ${suffix}`);
  }

  // Basic fallbacks
  const basicSuggestions: string[] = [
    party1.party,
    party2.party,
  ];

  const allSuggestions = [...basicSuggestions, ...suggestions];

  return Array.from(new Set(allSuggestions.filter(Boolean))).slice(0, 10);
}

/**
 * Generate a single new party name based purely on an ideology vector.
 */
export function generateNewPartyName(vals: PoliticalValues): string {
  // Average the political values
  const avgVals: Record<string, number> = {};
  for (const key of VALUES) {
    avgVals[key] = vals[key] ?? 0;
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
  const shuffledPairs = shuffle(ideologyPairs);

  if (shuffledPairs.length === 0) {
    return `New ${pick(STRUCTURAL_SUFFIXES)}`;
  }

  // Strategy A: adjective + noun from ideology banks
  for (const [adj, noun] of shuffledPairs.slice(0, 3)) {
    suggestions.push(`${adj} ${noun}`);
  }

  // Strategy B: mix adjective from one axis + noun from another
  if (shuffledPairs.length >= 2) {
    const { 0: adj } = shuffledPairs[0];
    const { 1: noun } = shuffledPairs[1];
    suggestions.push(`${adj} ${noun}`);
  }

  // Strategy C: prefix + ideology noun
  const prefixes = ['New', 'Democratic', 'Progressive', 'National', 'Popular', 'Free', 'Independent'];
  if (shuffledPairs.length > 0) {
    const { 1: noun } = shuffledPairs[0];
    suggestions.push(`${pick(prefixes)} ${noun}`);
  }

  // Strategy D: adjective + suffix
  if (shuffledPairs.length > 0) {
    const { 0: adj } = shuffledPairs[0];
    suggestions.push(`${adj} ${pick(STRUCTURAL_SUFFIXES)}`);
  }

  const allSuggestions = Array.from(new Set(suggestions.filter(Boolean)));
  return pick(allSuggestions);
}
