import fs from 'fs';
import path from 'path';

type PoliticalValues = {
  prog_cons: number; nat_glob: number; env_eco: number; soc_cap: number;
  pac_mil: number; auth_ana: number; rel_sec: number;
};
type Bloc = {
  id: string;
  weight?: number;
  center: Partial<PoliticalValues>;
  variance?: Partial<PoliticalValues>;
};
type Country = { pop: number; vals: Partial<PoliticalValues>; blocs?: Bloc[] };
type Candidate = {
  name: string; party: string; party_pop: number;
  vals: PoliticalValues;
};

const AXES: (keyof PoliticalValues)[] = ['prog_cons','nat_glob','env_eco','soc_cap','pac_mil','auth_ana','rel_sec'];

function randomNormal(mean = 0, std = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toCandidate(obj: any): Candidate {
  return {
    name: obj.name,
    party: obj.party,
    party_pop: Number(obj.party_pop ?? 0),
    vals: {
      prog_cons: Number(obj.prog_cons ?? 0),
      nat_glob: Number(obj.nat_glob ?? 0),
      env_eco: Number(obj.env_eco ?? 0),
      soc_cap: Number(obj.soc_cap ?? 0),
      pac_mil: Number(obj.pac_mil ?? 0),
      auth_ana: Number(obj.auth_ana ?? 0),
      rel_sec: Number(obj.rel_sec ?? 0),
    }
  };
}

function distMinusPopularity(voter: PoliticalValues, cand: Candidate): number {
  let sum = 0;
  for (const a of AXES) {
    const d = voter[a] - cand.vals[a];
    sum += d * d;
  }
  const popularityEffect = Math.pow(Math.max(0, cand.party_pop) * 3, 1.4);
  return sum - popularityEffect;
}

function clamp(x: number) { return Math.max(-100, Math.min(100, x)); }

function simulateBloc(bloc: Bloc, candidates: Candidate[], samples = 30000): Map<string, number> {
  const center: any = bloc.center || {};
  const variance: any = bloc.variance || {};
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.party, 0);

  for (let i = 0; i < samples; i++) {
    const voter: any = {};
    for (const a of AXES) {
      const mean = Number(center[a] ?? 0);
      const std = Number(variance[a] ?? 25);
      voter[a] = clamp(randomNormal(mean, std));
    }
    let best = candidates[0], bestScore = distMinusPopularity(voter as PoliticalValues, best);
    for (let k = 1; k < candidates.length; k++) {
      const score = distMinusPopularity(voter as PoliticalValues, candidates[k]);
      if (score < bestScore) { bestScore = score; best = candidates[k]; }
    }
    counts.set(best.party, (counts.get(best.party) || 0) + 1);
  }
  return counts;
}

const [,, countryName = 'UK', blocId = 'left_behind_patriots'] = process.argv;

const countriesPath = path.join(process.cwd(), 'public', 'data', 'countries.json');
const partiesPath = path.join(process.cwd(), 'public', 'data', 'parties.json');

const countries = loadJson<Record<string, Country>>(countriesPath);
const parties = loadJson<Record<string, any[]>>(partiesPath);

const country = countries[countryName];
const ukParties = (parties[countryName] || []).map(toCandidate);

if (!country?.blocs?.length) {
  console.error('No blocs found in countries.json for', countryName);
  process.exit(1);
}

const bloc = country.blocs.find(b => b.id === blocId);
if (!bloc) {
  console.error('Bloc not found:', blocId);
  process.exit(1);
}

const result = simulateBloc(bloc, ukParties, 40000);
const total = Array.from(result.values()).reduce((a,b)=>a+b,0);

console.log(`Bloc: ${blocId} (samples=${total})`);
for (const [party, count] of result.entries()) {
  console.log(`${party.padEnd(18)} ${((count/total)*100).toFixed(1)}%`);
}
