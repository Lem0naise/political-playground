import {  VALUES } from '@/types/game';


export const DESCRIPTORS: Record<string, Record<string, string | null>> = {
  "prog_cons": {"-100": "radical progressive", "-30": "progressive", "0": null, "30": "conservative", "100": "ultra-conservative"},
  "nat_glob": {"-100": "ultranationalist", "-45": "nationalist", "0": null, "45": "globalist", "100": "internationalist"},
  "env_eco": {"-90": "environmentalist", "0": null, "50": null, "60": "pro-growth", "100": "anti-environmentalist"},
  "soc_cap": {"-100": "far-left", "-50": "left-wing", "-15": "centre-left", "0": null, "15": "centre-right", "40": "pro-market", "100": "laissez-faire capitalistic"},
  "pac_mil": {"-100": "pacifist", "10": null, "65": "hawkish", "100": "ultra-militarist"},
  "auth_ana": {"-100": "totalitarian", "-60": "authoritarian", "-10": null, "70": "libertarian", "100": "anarchist"},
  "rel_sec": {"-100": "theocratic", "-60": "religious", "0": null, "50": "secular", "100": "state atheism"},
};


// Color mapping for descriptors (customize as needed)
const COLOR_MAP: Record<string, string> = {
  progressive: 'text-blue-700',
  'very progressive': 'text-blue-900',
  conservative: 'text-red-700',
  ultraconservative: 'text-red-900',
  nationalist: 'text-red-700',
  ultranationalist: 'text-red-900',
  globalist: 'text-blue-700',
  internationalist: 'text-blue-900',
  environmentalist: 'text-green-700',
  'anti-environmentalist': 'text-amber-700',
  'far-left': 'text-red-700',
  'left-wing': 'text-red-500',
  'centre-left': 'text-orange-600',
  centrist: 'text-slate-700',
  'centre-right': 'text-green-600',
  corporatist: 'text-green-900',
  pacifist: 'text-blue-700',
  militarist: 'text-red-700',
  ultramilitaristic: 'text-red-900',
  dictatorial: 'text-red-900',
  authoritarian: 'text-red-700',
  liberal: 'text-blue-700',
  anarchist: 'text-blue-900',
  theocratic: 'text-yellow-700',
  religious: 'text-yellow-700',
  secular: 'text-blue-700',
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
          color: COLOR_MAP[desc] || 'text-slate-700'
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

  // Font sizes for descending order
  const fontSizes = [
    "text-xl sm:text-2xl",
    "text-lg sm:text-xl",
    "text-base sm:text-lg",
    "text-sm sm:text-base",
    "text-xs sm:text-sm"
  ];

  return (
    <div className=" font-mono bg-slate-200 border border-slate-400 rounded p-3 sm:p-4 mb-2">
      <div className="font-bold text-slate-800 border-b border-slate-400 pb-1 mb-2 text-xs sm:text-sm campaign-status">
        POLITICAL PROFILE:
      </div>
      <ul className="flex flex-col gap-1">
        {filtered.map((d, i) => (
          <li
            key={d.key}
            className={`font-mono font-extrabold uppercase ${d.color} ${fontSizes[i] || "text-xs"}`}
            style={{ letterSpacing: "0.04em" }}
          >
            {d.desc}
          </li>
        ))}
      </ul>
    </div>
  );
}
