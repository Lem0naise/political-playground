import { VALUES, PoliticalValues, Candidate } from '@/types/game';

/**
 * Calculates the weighted average ideology of a group of parties (e.g. a coalition).
 * Uses the provided percentages (seat share or vote share) to weight the results.
 */
export function calculateWeightedIdeology(
  partners: Candidate[],
  percentages: Record<string, number>
): number[] {
  const coalitionValues: number[] = new Array(VALUES.length).fill(0);
  let totalWeight = 0;

  partners.forEach(partner => {
    const weight = percentages[partner.party] || 0;
    totalWeight += weight;

    VALUES.forEach((_, index) => {
      // Use 50 as neutral fallback if values are missing
      coalitionValues[index] += (partner.vals[index] ?? 50) * weight;
    });
  });

  if (totalWeight > 0) {
    VALUES.forEach((_, index) => {
      coalitionValues[index] = coalitionValues[index] / totalWeight;
    });
  } else {
    // If no weight (shouldn't happen), default to neutral 50s
    return new Array(VALUES.length).fill(50);
  }

  return coalitionValues;
}



export const DESCRIPTORS: Record<string, Record<string, string | null>> = {
  "prog_cons": { "-100": "radical progressive", "-30": "progressive", "0": null, "30": "conservative", "100": "ultra-conservative" },
  "nat_glob": { "-100": "ultranationalist", "-45": "nationalist", "0": null, "45": "globalist", "100": "internationalist" },
  "env_eco": { "-90": "environmentalist", "0": null, "50": null, "60": "pro-growth", "100": "anti-environmentalist" },
  "soc_cap": { "-100": "far-left", "-50": "left-wing", "-15": "centre-left", "0": null, "15": "centre-right", "40": "pro-market", "100": "laissez-faire capitalistic" },
  "pac_mil": { "-100": "pacifist", "10": null, "65": "hawkish", "100": "ultra-militarist" },
  "auth_ana": { "-100": "totalitarian", "-60": "authoritarian", "-10": null, "70": "libertarian", "100": "anarchist" },
  "rel_sec": { "-100": "theocratic", "-60": "religious", "0": null, "50": "secular", "100": "state atheism" },
};

// Comparative descriptors for when comparing player to a bloc
const COMPARATIVE_DESCRIPTORS: Record<string, { negative: string, positive: string }> = {
  "prog_cons": { negative: "progressive", positive: "conservative" },
  "nat_glob": { negative: "nationalist", positive: "globalist" },
  "env_eco": { negative: "environmentalist", positive: "pro-growth" },
  "soc_cap": { negative: "socialist", positive: "capitalist" },
  "pac_mil": { negative: "pacifist", positive: "militaristic" },
  "auth_ana": { negative: "authoritarian", positive: "libertarian" },
  "rel_sec": { negative: "religious", positive: "secular" },
};


// Color mapping for descriptors (customized for dark mode)
const COLOR_MAP: Record<string, string> = {
  'radical progressive': 'text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]',
  progressive: 'text-blue-400',
  conservative: 'text-red-400',
  'ultra-conservative': 'text-red-300 drop-shadow-[0_0_8px_rgba(252,165,165,0.5)]',

  ultranationalist: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  nationalist: 'text-red-400',
  globalist: 'text-blue-400',
  internationalist: 'text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]',

  environmentalist: 'text-green-400',
  'pro-growth': 'text-yellow-400',
  'anti-environmentalist': 'text-amber-500',

  'far-left': 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  'left-wing': 'text-red-400',
  'centre-left': 'text-orange-400',
  'centre-right': 'text-sky-400',
  'pro-market': 'text-blue-400',
  'laissez-faire capitalistic': 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]',

  pacifist: 'text-teal-400',
  hawkish: 'text-red-400',
  'ultra-militarist': 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',

  totalitarian: 'text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]',
  authoritarian: 'text-red-400',
  libertarian: 'text-yellow-400',
  anarchist: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]',

  theocratic: 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]',
  religious: 'text-yellow-400',
  secular: 'text-blue-400',
  'state atheism': 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]',
};

export function getIdeologyDescriptors(vals: number[]): Array<{ key: string, desc: string, color: string }> {
  const descriptors: Array<{ key: string, desc: string, color: string }> = [];
  let orderTemplate: number[] = [];
  VALUES.forEach((key, idx) => {
    const val = vals[idx];
    const descMap = DESCRIPTORS[key];
    // Find the closest key (numerically), regardless of value
    let closestKey: number | null = null;
    let minDiff = Infinity;
    for (const k in descMap) {
      const numK = Number(k);
      const diff = Math.abs(val - numK);
      if (diff < minDiff) {
        minDiff = diff;
        closestKey = numK;
      }
    }

    // If the closest descriptor is not null, add it
    if (closestKey !== null) {
      const desc = descMap[String(closestKey)];
      if (desc) {
        descriptors.push({
          key,
          desc,
          color: COLOR_MAP[desc] || 'text-slate-300'
        });
        orderTemplate.push(Math.abs(val));
      }
    }
  });
  const sortedDescriptors = [...descriptors];

  sortedDescriptors.sort((a, b) => {
    const indexA = descriptors.indexOf(a)
    const indexB = descriptors.indexOf(b)
    const comparison = orderTemplate[indexB] - orderTemplate[indexA];
    if (comparison === 0) {
      return indexA - indexB; // Preserve original order for ties
    }
    return comparison;
  })
  return sortedDescriptors;
}

export function getIdeologyProfile(vals: number[]) {
  const descriptors = getIdeologyDescriptors(vals);
  // Remove duplicates and nulls, keep order
  const seen = new Set<string>();
  const filtered = descriptors.filter(d => {
    if (!d.desc || seen.has(d.desc)) return false;
    seen.add(d.desc);
    return true;
  });

  const fontSizes = [
    "text-2xl sm:text-3xl", // Bumped up the top size slightly for a better "cloud" contrast
    "text-xl sm:text-2xl",
    "text-lg sm:text-xl",
    "text-base sm:text-lg",
    "text-sm sm:text-base"
  ];

  return (
    <div className="font-mono bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 mb-2 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-600 pb-2 mb-3">
        <div className="w-1.5 h-4 bg-yellow-400 rounded-full"></div>
        <div className="font-bold text-slate-300 text-xs sm:text-sm tracking-widest uppercase">
          Political Profile
        </div>
      </div>

      {/* Word Cloud Container */}
      <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 text-center py-2">
        {filtered.map((d, i) => (
          <span
            key={d.key}
            className={`inline-block font-mono font-black uppercase tracking-wider transition-transform hover:scale-110 cursor-default ${d.color} ${fontSizes[i] || "text-xs"}`}
          >
            {d.desc}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Generate comparative ideology descriptors showing how a voter bloc perceives the player
 * relative to the bloc's center position on each political axis.
 * Returns descriptors sorted by distance magnitude (most different first).
 */
export function getComparativeDescriptors(
  playerVals: number[],
  blocCenter: PoliticalValues
): Array<{ key: string; desc: string; distance: number }> {
  const comparisons: Array<{ key: string; desc: string; distance: number }> = [];

  VALUES.forEach((key, idx) => {
    const playerValue = playerVals[idx];
    const blocValue = blocCenter[key];
    const distance = playerValue - blocValue;
    const absDistance = Math.abs(distance);

    // Only show if there's a meaningful difference (threshold of 15 points)
    if (absDistance < 20) return;

    const comparative = COMPARATIVE_DESCRIPTORS[key];
    if (!comparative) return;

    // Determine descriptor based on direction and magnitude
    let descriptor = '';
    const direction = distance > 0 ? comparative.positive : comparative.negative;

    if (absDistance >= 70) {
      descriptor = `far too ${direction}`;
    } else if (absDistance >= 45) {
      descriptor = `too ${direction}`;
    } else {
      descriptor = `slightly too ${direction}`;
    }

    comparisons.push({
      key,
      desc: descriptor,
      distance: absDistance
    });
  });

  // Sort by distance descending (most different first)
  comparisons.sort((a, b) => b.distance - a.distance);

  return comparisons;
}
