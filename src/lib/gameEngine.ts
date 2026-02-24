import { Candidate, Country, VALUES, EVENT_EFFECT_MULTIPLIER, PoliticalValues, DEBUG, TOO_FAR_DISTANCE, VOTE_MANDATE, ActiveTrend, TrendDefinition, PoliticalValueKey, PROBABILISTIC_VOTING, SOFTMAX_BETA, LOYALTY_UTILITY, VoterBloc } from '@/types/game';

// Generate random normal distribution using Box-Muller transform
function randomNormal(mean: number = 0, std: number = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
}

export function createCandidate(
  id: number,
  name: string,
  party: string,
  party_pop: number,
  prog_cons: number,
  nat_glob: number,
  env_eco: number,
  soc_cap: number,
  pac_mil: number,
  auth_ana: number,
  rel_sec: number,
  colour?: string,
  swing?: number
): Candidate {
  return {
    id,
    name,
    party,
    party_pop,
    vals: [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec],
    colour: colour || 'gray',
    swing,
    is_player: false
  };
}

const TREND_INTERVAL_MIN = 3;
const TREND_INTERVAL_MAX = 5;
const TREND_VOTER_NOISE = 0.35;

const TREND_DEFINITIONS: TrendDefinition[] = [
  {
    id: 'border_backlash',
    title: 'Border Backlash',
    description: 'Immigration talk shows ignite fears about porous frontiers.',
    valueKey: 'nat_glob',
    direction: -1,
    directionLabel: 'toward stricter borders',
    axisLabel: 'national identity',
    shiftRange: [7, 20],
    durationRange: [4, 6],
    startTemplates: [
      'Public Opinion: {title} sweeps the nation — {description}',
      'Public Opinion: {title} pushes public mood {directionLabel}; strategists expect {duration}-week turbulence.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps nudging voters {directionLabel}',
      'Talkback callers drive a drift {directionLabel} on the {axisLabel} axis.'
    ],
    completionTemplates: [
      'Trend Cools: {title} leaves a legacy {directionLabel}.',
      '{title} settles after {duration} hectic weeks, cementing a shift {directionLabel}.'
    ]
  },
  {
    id: 'global_outreach',
    title: 'Global Outreach Wave',
    description: 'Trade delegations and cultural festivals celebrate open borders.',
    valueKey: 'nat_glob',
    direction: 1,
    directionLabel: 'toward open borders',
    axisLabel: 'national identity',
    shiftRange: [6, 11],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} bursts onto the scene — {description}',
      'TREND ALERT: {title} lifts optimism {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps dialling voters {directionLabel}; average now {currentValue}.',
      'Exports chatter fuels another {shiftAbs}-point move {directionLabel} along the {axisLabel} axis.'
    ],
    completionTemplates: [
      'Trend Cools: {title} locks in a surge {directionLabel}.',
      '{title} wraps after {duration} upbeat weeks, anchoring a significant shift {directionLabel}.'
    ]
  },
  {
    id: 'climate_alarm',
    title: 'Climate Alarm',
    description: 'Wildfires dominate headlines and scientists demand urgent cuts.',
    valueKey: 'env_eco',
    direction: -1,
    directionLabel: 'toward environmental action',
    axisLabel: 'climate-policy',
    shiftRange: [8, 18],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} grips voters — {description}',
      'TREND ALERT: {title} shifts focus {directionLabel} for at least {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps policy debate {directionLabel}; climate axis now {currentValue}.',
      'Emergency town halls add another {shiftAbs}-point tilt {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} ends after {duration} weeks with a realignment {directionLabel}.',
      '{title} winds down, locking in a shift {directionLabel} on climate policy.'
    ]
  },
  {
    id: 'industrial_push',
    title: 'Industrial Push',
    description: 'Manufacturers trumpet new jobs and lobby for looser regulations.',
    valueKey: 'env_eco',
    direction: 1,
    directionLabel: 'toward industrial growth',
    axisLabel: 'climate-policy',
    shiftRange: [6, 10],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} takes hold — {description}',
      'TREND ALERT: {title} pulls the debate {directionLabel} through the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps voters eyeing factories',
      'Business press drives another shift {directionLabel} on the {axisLabel} axis.'
    ],
    completionTemplates: [
      'Trend Cools: {title} leaves a significant footprint {directionLabel}.',
      '{title} completes its arc, banking a shift {directionLabel}.'
    ]
  },
  {
    id: 'workers_wave',
    title: 'Workers Wave',
    description: 'Strike waves and wage demands dominate factory towns.',
    valueKey: 'soc_cap',
    direction: -1,
    directionLabel: 'toward worker protections',
    axisLabel: 'economic model',
    shiftRange: [7, 13],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} surges — {description}',
      'TREND ALERT: {title} nudges debate {directionLabel} for roughly {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps wages front-page; axis now {currentValue}.',
      'Union rallies notch another {shiftAbs}-point slide {directionLabel} on the {axisLabel} scale.'
    ],
    completionTemplates: [
      'Trend Cools: {title} locks in a significant shift {directionLabel}.',
      '{title} winds down, leaving policy {directionLabel}'
    ]
  },
  {
    id: 'market_mania',
    title: 'Market Mania',
    description: 'Stock surges and startup hype boost faith in free markets.',
    valueKey: 'soc_cap',
    direction: 1,
    directionLabel: 'toward free-market reforms',
    axisLabel: 'economic model',
    shiftRange: [6, 11],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} catches fire — {description}',
      'TREND ALERT: {title} drifts sentiment {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps investors bullish',
      'Business sections tout another shift {directionLabel} on the {axisLabel} front.'
    ],
    completionTemplates: [
      'Trend Cools: {title} settles after {duration} weeks with a significant shift {directionLabel}.',
      '{title} fades, banking a shift {directionLabel}.'
    ]
  },
  {
    id: 'security_alert',
    title: 'Security Alert',
    description: 'Border skirmishes spur calls for tougher defence.',
    valueKey: 'pac_mil',
    direction: 1,
    directionLabel: 'toward hawkish security',
    axisLabel: 'security posture',
    shiftRange: [7, 13],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} shakes the cabinet — {description}',
      'TREND ALERT: {title} drives discourse {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps defence boards on edge',
      'War room briefings spur another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} concludes with a significant tilt {directionLabel}.',
      '{title} winds down, entrenching a shift {directionLabel}.'
    ]
  },
  {
    id: 'peace_push',
    title: 'Peace Push',
    description: 'Peace marches and defence scandals call for demilitarisation.',
    valueKey: 'pac_mil',
    direction: -1,
    directionLabel: 'toward demilitarisation',
    axisLabel: 'security posture',
    shiftRange: [6, 16],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} sweeps campuses in {region} — {description}',
      'TREND ALERT: {title} reorients debate {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps voters chanting {directionLabel}',
      'Whistleblower leaks add another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} leaves a significant imprint {directionLabel}.',
      '{title} closes after {duration} weeks in {region}, banking a shift {directionLabel}.'
    ]
  },
  {
    id: 'order_drive',
    title: 'Order Drive',
    description: 'Crime sprees push voters to demand stronger authority.',
    valueKey: 'auth_ana',
    direction: -1,
    directionLabel: 'toward law-and-order authority',
    axisLabel: 'civil liberty',
    shiftRange: [6, 14],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} dominates tabloids in {region} — {description}',
      'TREND ALERT: {title} drags sentiment {directionLabel} for the next {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} tightens attitudes in {city}{directionLabel}',
      'Police unions claim another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} settles after {duration} weeks with a significant move {directionLabel}.',
      '{title} wraps, leaving voters {directionLabel} by a significant margin.'
    ]
  },
  {
    id: 'liberty_swell',
    title: 'Liberty Swell',
    description: 'Court victories and protest camps demand civil freedoms.',
    valueKey: 'auth_ana',
    direction: 1,
    directionLabel: 'toward civil liberties',
    axisLabel: 'civil liberty',
    shiftRange: [6, 15],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} lights up social media in {region} — {description}',
      'TREND ALERT: {title} turns the spotlight {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps rallies growing in {region}',
      'Rights advocates notch another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} leaves {organisation} in {city} {directionLabel} by a significant margin.',
      '{title} closes after {duration} weeks, locking in a shift {directionLabel}.'
    ]
  },
  {
    id: 'faith_revival',
    title: 'Faith Revival',
    description: 'Mega-church crusades and moral campaigns dominate headlines.',
    valueKey: 'rel_sec',
    direction: -1,
    directionLabel: 'toward religious values',
    axisLabel: 'cultural identity',
    shiftRange: [7, 13],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} fills town squares in {region} — {description}',
      'TREND ALERT: {title} swings discourse {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps pulpits in {city} buzzing',
      'Pilgrimages spark another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} settles with a significant imprint {directionLabel}.',
      '{title} finishes its run, leaving the axis {directionLabel} by a significant margin.'
    ]
  },
  {
    id: 'secular_surge',
    title: 'Secular Surge',
    description: 'Ethics reforms and science funding swing debate away from pulpits.',
    valueKey: 'rel_sec',
    direction: 1,
    directionLabel: 'toward secular values',
    axisLabel: 'cultural identity',
    shiftRange: [6, 12],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} hits {region} parliament — {description}',
      'TREND ALERT: {title} edges {city} sentiment {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps classrooms in {city} buzzing',
      'Academic summits add another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} locks in a shift {directionLabel}.',
      '{title} winds down after {duration} weeks, cementing a move {directionLabel}.'
    ]
  },
  {
    id: 'progressive_wave',
    title: 'Progressive Wave',
    description: 'Grassroots organisers push bold reforms on social issues.',
    valueKey: 'prog_cons',
    direction: -1,
    directionLabel: 'toward progressive ideals',
    axisLabel: 'cultural values',
    shiftRange: [7, 13],
    durationRange: [4, 6],
    startTemplates: [
      'TREND ALERT: {title} surges in {region} — {description}',
      'TREND ALERT: {title} steers debate {directionLabel} through {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps activists mobilised',
      'Petitions in {city} deliver another shift {directionLabel} on the {axisLabel} scale.'
    ],
    completionTemplates: [
      'Trend Cools: {title} caps a significant pivot {directionLabel}.',
      '{title} winds down in {region}, locking in a shift {directionLabel}.'
    ]
  },
  {
    id: 'heritage_moment',
    title: 'Heritage Moment',
    description: 'Traditionalist movements rally around national heritage.',
    valueKey: 'prog_cons',
    direction: 1,
    directionLabel: 'toward conservative nostalgia',
    axisLabel: 'cultural values',
    shiftRange: [6, 12],
    durationRange: [3, 5],
    startTemplates: [
      'TREND ALERT: {title} sweeps heritage festivals — {description}',
      'TREND ALERT: {title} nudges conversations {directionLabel} for {duration} weeks.'
    ],
    ongoingTemplates: [
      'Trend Watch: {title} keeps voters reminiscing',
      'Cultural galas add another shift {directionLabel}.'
    ],
    completionTemplates: [
      'Trend Cools: {title} leaves a significant imprint {directionLabel}.',
      '{title} concludes, preserving a shift {directionLabel}.'
    ]
  }
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickTemplate(templates: string[], fallback: string): string {
  if (!templates || templates.length === 0) {
    return fallback;
  }
  return templates[Math.floor(Math.random() * templates.length)];
}

function buildTrendContext(
  trend: ActiveTrend,
  currentValue: number,
  shift: number,
  remainingWeeks: number
): Record<string, string> {
  return {
    title: trend.title,
    description: trend.description,
    directionLabel: trend.directionLabel,
    axisLabel: trend.axisLabel,
    duration: String(trend.duration),
    totalShift: trend.totalShift.toFixed(1),
    totalShiftAbs: Math.abs(trend.totalShift).toFixed(1),
    shift: shift.toFixed(1),
    shiftAbs: Math.abs(shift).toFixed(1),
    currentValue: Math.round(currentValue).toString(),
    weeksRemaining: Math.max(0, remainingWeeks).toString(),
    startWeek: trend.startWeek.toString(),
    endWeek: trend.endWeek.toString()
  };
}

function formatTrendTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => context[key] ?? '');
}

export function scheduleNextTrendPoll(currentWeek: number, minGap: number = TREND_INTERVAL_MIN, maxGap: number = TREND_INTERVAL_MAX): number {
  return currentWeek + randomInt(minGap, maxGap);
}

export function createTrend(currentWeek: number, excludeValueKey?: PoliticalValueKey): ActiveTrend {
  let available: TrendDefinition[] = TREND_DEFINITIONS;
  if (excludeValueKey) {
    const filtered = TREND_DEFINITIONS.filter(def => def.valueKey !== excludeValueKey);
    if (filtered.length > 0) {
      available = filtered;
    }
  }

  const definition = available[Math.floor(Math.random() * available.length)];
  const duration = randomInt(definition.durationRange[0], definition.durationRange[1]);
  const totalShiftMagnitude = randomInRange(definition.shiftRange[0], definition.shiftRange[1]);
  const totalShift = parseFloat((totalShiftMagnitude * definition.direction).toFixed(2));

  return {
    ...definition,
    totalShift,
    weeklyShift: parseFloat((totalShift / duration).toFixed(2)),
    duration,
    remainingWeeks: duration,
    appliedShift: 0,
    startWeek: currentWeek,
    endWeek: currentWeek + duration - 1
  };
}

export function formatTrendStartHeadline(trend: ActiveTrend): string {
  const context = buildTrendContext(trend, 0, 0, trend.remainingWeeks);
  const template = pickTemplate(
    trend.startTemplates,
    `TREND ALERT: ${trend.title} shifts sentiment ${trend.directionLabel}.`
  );
  return formatTrendTemplate(template, context);
}

export interface TrendStepResult {
  trend: ActiveTrend | null;
  values: PoliticalValues;
  blocs?: VoterBloc[];
  ongoingNews?: string;
  completionNews?: string;
  completedTrend?: ActiveTrend;
}

export function applyTrendStep(
  trend: ActiveTrend,
  countryValues: PoliticalValues,
  votingData: number[][],
  blocs?: VoterBloc[]
): TrendStepResult {
  const axisIndex = VALUES.indexOf(trend.valueKey as typeof VALUES[number]);
  const expectedShift = trend.remainingWeeks <= 1
    ? trend.totalShift - trend.appliedShift
    : trend.weeklyShift;
  const currentValue = countryValues[trend.valueKey];
  const nextValueRaw = currentValue + expectedShift;
  const clampedValue = Math.max(-100, Math.min(100, nextValueRaw));
  const actualShift = clampedValue - currentValue;

  const newValues: PoliticalValues = {
    ...countryValues,
    [trend.valueKey]: clampedValue
  };

  let newBlocs = blocs;
  if (blocs && actualShift !== 0) {
    newBlocs = blocs.map(bloc => {
      const newCenterValue = Math.max(-100, Math.min(100, bloc.center[trend.valueKey] + actualShift));
      return {
        ...bloc,
        center: {
          ...bloc.center,
          [trend.valueKey]: newCenterValue
        }
      };
    });
  }

  if (axisIndex !== -1 && votingData[axisIndex]) {
    const axisData = votingData[axisIndex];
    for (let i = 0; i < axisData.length; i++) {
      const noise = actualShift === 0 ? 0 : (Math.random() - 0.5) * Math.abs(actualShift) * TREND_VOTER_NOISE;
      const newVal = axisData[i] + actualShift + noise;
      axisData[i] = Math.max(-100, Math.min(100, newVal));
    }
  }

  const appliedShift = trend.appliedShift + actualShift;
  const remainingWeeks = trend.remainingWeeks - 1;

  const context = buildTrendContext(trend, clampedValue, actualShift, remainingWeeks);
  const ongoingTemplate = pickTemplate(
    trend.ongoingTemplates,
    `Trend Watch: ${trend.title} moves sentiment ${trend.directionLabel}.`
  );
  const ongoingNews = formatTrendTemplate(ongoingTemplate, context);

  if (remainingWeeks > 0) {
    const updatedTrend: ActiveTrend = {
      ...trend,
      remainingWeeks,
      appliedShift
    };
    return {
      trend: updatedTrend,
      values: newValues,
      blocs: newBlocs,
      ongoingNews
    };
  }

  const completionTemplate = pickTemplate(
    trend.completionTemplates,
    `Trend Cools: ${trend.title} leaves a ${Math.abs(appliedShift).toFixed(1)}-point mark ${trend.directionLabel}.`
  );
  const completionNews = formatTrendTemplate(completionTemplate, context);
  const completedTrend: ActiveTrend = {
    ...trend,
    remainingWeeks: 0,
    appliedShift
  };

  return {
    trend: null,
    values: newValues,
    blocs: newBlocs,
    ongoingNews,
    completionNews,
    completedTrend
  };
}

// Track last choices across polls to provide loyalty inertia
let LAST_CHOICES: number[] | null = null;
// Snapshot of voter choices at poll 1 (for transfer flow analysis)
let INITIAL_CHOICES: number[] | null = null;
// Track each voter's bloc assignment (index into country.blocs), -1 for independents
let VOTER_BLOC_IDS: number[] | null = null;

export interface EngineState {
  lastChoices: number[] | null;
  initialChoices: number[] | null;
  voterBlocIds: number[] | null;
}

export function getEngineState(): EngineState {
  return {
    lastChoices: LAST_CHOICES,
    initialChoices: INITIAL_CHOICES,
    voterBlocIds: VOTER_BLOC_IDS
  };
}

export function setEngineState(state: EngineState): void {
  LAST_CHOICES = state.lastChoices;
  INITIAL_CHOICES = state.initialChoices;
  VOTER_BLOC_IDS = state.voterBlocIds;
}

function ensureLastChoices(length: number): void {
  if (!LAST_CHOICES || LAST_CHOICES.length !== length) {
    LAST_CHOICES = new Array(length).fill(-1);
    INITIAL_CHOICES = null; // Reset initial snapshot when electorate changes
  }
}

/** Call once after the first poll to lock in the baseline voter preferences. */
export function snapshotInitialChoices(): void {
  if (LAST_CHOICES) {
    INITIAL_CHOICES = [...LAST_CHOICES];
  }
}

/** Build a voter-transfer matrix comparing poll-1 choices to final choices.
 *  Returns a list of {from, to, count, fromTotal, percentage} entries, sorted by count desc.
 *  `percentage` = share of the FROM-party's original voters who moved to that destination.
 *  Only caller-supplied candidateNames are used; abstainers (index -1) are labelled "Abstain".
 */
export function getVoterTransferMatrix(
  candidateNames: string[]
): Array<{ from: string; to: string; count: number; fromTotal: number; percentage: number }> {
  if (!INITIAL_CHOICES || !LAST_CHOICES || INITIAL_CHOICES.length === 0) return [];

  const total = INITIAL_CHOICES.length;

  // Count every from→to pair
  const counts: Record<string, number> = {};
  // Count totals per from-party
  const fromTotals: Record<string, number> = {};

  for (let i = 0; i < total; i++) {
    const fromIdx = INITIAL_CHOICES[i];
    const toIdx = LAST_CHOICES[i];
    const fromName = fromIdx >= 0 ? (candidateNames[fromIdx] ?? 'Unknown') : 'Abstain';
    const toName = toIdx >= 0 ? (candidateNames[toIdx] ?? 'Unknown') : 'Abstain';
    const key = `${fromName}|||${toName}`;
    counts[key] = (counts[key] ?? 0) + 1;
    fromTotals[fromName] = (fromTotals[fromName] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([key, count]) => {
      const [from, to] = key.split('|||');
      const fromTotal = fromTotals[from] ?? 1;
      return { from, to, count, fromTotal, percentage: (count / fromTotal) * 100 };
    })
    .sort((a, b) => b.count - a.count);
}

function softmaxPick(utilities: number[], beta: number): number {
  const maxU = Math.max(...utilities);
  const exps = utilities.map(u => Math.exp(beta * (u - maxU)));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i];
    if (r <= 0) return i;
  }
  return exps.length - 1;
}

// Build normalized salience weights for a voter (sum to number of axes)
function salienceWeightsForVoter(voterIndex: number, country?: Country): number[] {
  const n = VALUES.length;
  const w = new Array(n).fill(1);

  if (!country?.blocs || !VOTER_BLOC_IDS) return w;
  const bi = VOTER_BLOC_IDS[voterIndex] ?? -1;
  if (bi < 0) return w;

  const bloc = country.blocs[bi];
  const s = bloc?.salience as Partial<PoliticalValues> | undefined;
  if (!s) return w;

  for (let i = 0; i < n; i++) {
    const key = VALUES[i];
    const sv = (s as any)[key];
    if (typeof sv === 'number' && Number.isFinite(sv)) {
      w[i] = Math.max(0, sv);
    } else {
      w[i] = 1;
    }
  }

  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return new Array(n).fill(1);
  const scale = n / sum; // normalize so average weight is 1
  for (let i = 0; i < n; i++) w[i] *= scale;
  return w;
}

export function generateVotingData(country: Country): number[][] {

  const stdDefault = 45;
  const blocs = country.blocs || [];
  const axes = VALUES; // e.g., ['prog_cons','nat_glob',...]
  const pop = Math.max(0, country.pop | 0);

  // Prepare arrays per axis
  const data: number[][] = Array.from({ length: axes.length }, () => new Array<number>(pop));
  // Prepare bloc assignment memory
  VOTER_BLOC_IDS = new Array(pop).fill(-1);


  if (!blocs.length) {
    // Unimodal fallback
    for (let i = 0; i < pop; i++) {
      for (let a = 0; a < axes.length; a++) {
        const key = axes[a];
        const mean = country.vals[key] ?? 0;
        const v = randomNormal(mean, stdDefault);
        data[a][i] = Math.max(-100, Math.min(100, v));
      }
    }
    return data;
  }


  // Precompute cumulative weights (allow independents if sum < 1)
  const weightSum = blocs.reduce((s, b) => s + Math.max(0, Math.min(1, b.weight ?? 0)), 0);
  function pickBloc(): number | null {
    const r = Math.random();
    if (r > weightSum) return null; // independents
    let acc = 0;
    for (let i = 0; i < blocs.length; i++) {
      acc += Math.max(0, Math.min(1, blocs[i].weight ?? 0));
      if (r <= acc) return i;
    }
    return null;
  }

  // Sample full vectors per voter from one bloc
  for (let i = 0; i < pop; i++) {
    const bi = pickBloc();
    const bloc = bi !== null ? blocs[bi] : null;
    if (bi !== null) VOTER_BLOC_IDS[i] = bi;
    for (let a = 0; a < axes.length; a++) {
      const key = axes[a];
      const mean =
        (bloc?.center?.[key] !== undefined ? bloc!.center![key] : undefined) ??
        country.vals[key] ?? 0;
      const std =
        (bloc?.variance && typeof bloc.variance === 'object' && (bloc.variance as any)[key] !== undefined
          ? (bloc.variance as any)[key]
          : (typeof bloc?.variance === 'number' ? (bloc!.variance as number) : stdDefault));
      const v = randomNormal(mean as number, Math.max(5, Math.min(100, Number(std))));
      data[a][i] = Math.max(-100, Math.min(100, v));
    }
  }

  return data;
}

export function voteForCandidate(voterIndex: number, candidates: Candidate[], data: number[][], country?: Country): number | null {
  // Compute raw squared distances for turnout gating and utilities for choice
  const rawDistSq: number[] = new Array(candidates.length).fill(0);
  const utilities: number[] = new Array(candidates.length).fill(0);

  // Normalized salience weights for this voter; sum equals number of axes
  const weights = salienceWeightsForVoter(voterIndex, country);

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    let sumSq = 0; // raw L2 for turnout
    let weightedLoss = 0; // salience-weighted squared loss for utility
    for (let o = 0; o < VALUES.length; o++) {
      const d = data[o][voterIndex] - cand.vals[o];
      sumSq += d * d;
      weightedLoss += weights[o] * d * d;
    }
    rawDistSq[i] = sumSq;

    // Utility: proximity (negative weighted loss) + gentle popularity + optional swing + loyalty
    let u = -weightedLoss + Math.max(0, cand.party_pop) * 0.5;
    if (cand.swing) {
      u += (cand.swing * 5) * Math.abs(cand.swing * 5);
    }
    // Loyalty inertia: bonus if voter sticks with previous choice
    const last = LAST_CHOICES?.[voterIndex];
    if (last !== undefined && last === i) {
      u += LOYALTY_UTILITY;
    }
    utilities[i] = u;
  }

  // Turnout gating based on nearest raw distance (pre-utility)
  const minRawSq = Math.min(...rawDistSq);
  if (minRawSq > Math.pow(TOO_FAR_DISTANCE, 2) && !VOTE_MANDATE) {
    return null;
  }

  // Choice: probabilistic softmax or deterministic max-utility
  if (PROBABILISTIC_VOTING) {
    return softmaxPick(utilities, SOFTMAX_BETA);
  }
  return utilities.indexOf(Math.max(...utilities));
}

export function applyPoliticalDynamics(candidates: Candidate[], pollIteration: number): string[] {
  const newsEvents: string[] = [];

  if (pollIteration === 1) {
    // First poll - minimal variation to establish baseline
    for (const candidate of candidates) {
      const baselineVariation = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2
      candidate.party_pop += baselineVariation;

      // Initialize momentum tracking
      if (!candidate.momentum) candidate.momentum = 0;
      if (!candidate.previous_popularity) candidate.previous_popularity = candidate.party_pop;
    }
    newsEvents.push("ELECTION SEASON OFFICIALLY BEGINS.");
    return newsEvents;
  }

  // Calculate current standings for bandwagon effects
  const currentStandings = [...candidates].sort((a, b) => b.party_pop - a.party_pop);
  const leader = currentStandings[0];

  // Market volatility - occasional larger political shifts
  const isVolatileMarket = Math.random() < 0.15;
  if (isVolatileMarket && DEBUG) {
    console.log(`DEBUG: Market is experiencing high volatility.`);
  }

  // Track momentum and bandwagon effects for news
  const highMomentumParties: string[] = [];
  const decliningParties: string[] = [];

  for (const candidate of candidates) {
    const oldPopularity = candidate.party_pop;

    // Calculate momentum from recent performance
    if (candidate.previous_popularity !== undefined) {
      const momentumChange = candidate.party_pop - candidate.previous_popularity;
      // Momentum factor - carry forward 30% of recent change
      candidate.momentum = (candidate.momentum || 0) * 0.7 + momentumChange * 0.3;
    }

    // Incumbency effects - popular parties face erosion, struggling ones get recovery
    let incumbencyEffect = 0;
    if (candidate.party_pop > 10) {
      incumbencyEffect = -0.1 * (candidate.party_pop / 20); // Voter fatigue
    } else {
      incumbencyEffect = 0.05; // Small recovery boost for struggling parties
    }

    // Bandwagon effect - leading parties get small boost
    let bandwagonEffect = 0;
    if (candidate === leader && candidate.party_pop > 15) {
      bandwagonEffect = 0.2;
    } else if (candidate.party_pop < -10) {
      bandwagonEffect = -0.1; // Additional losses for struggling parties
    }

    // Apply momentum with decay
    const momentumEffect = (candidate.momentum || 0) * 0.3; // 30% of momentum carries forward
    if (candidate.momentum) candidate.momentum *= 0.85; // Momentum decays over time

    // Natural political variation (smaller than old random changes)
    const naturalVariation = (Math.random() - 0.5) * 0.6; // -0.3 to 0.3

    // Apply market volatility per party independently if the market is volatile
    let marketVolatility = 0.0;
    if (isVolatileMarket) {
      marketVolatility = (Math.random() - 0.5) * 3; // -1.5 to 1.5
    }

    // Combine all effects
    const totalChange = incumbencyEffect + bandwagonEffect + momentumEffect + naturalVariation + marketVolatility;

    candidate.party_pop += totalChange;

    // Store previous popularity for next iteration
    candidate.previous_popularity = oldPopularity;

    // Ensure party popularity doesn't go extreme values
    if (candidate.party_pop > 100) {
      candidate.party_pop = 100;
    } else if (candidate.party_pop < -50) {
      candidate.party_pop = -50;
    }

    // Track parties with significant momentum changes for news
    if (momentumEffect > 1.0) {
      highMomentumParties.push(candidate.party);
    } else if (momentumEffect < -1.0) {
      decliningParties.push(candidate.party);
    }

    if (DEBUG && Math.abs(totalChange) > 0.5) {
      console.log(`DEBUG: ${candidate.party} change: ${totalChange.toFixed(2)}`);
    }
  }

  // Generate momentum-based news events
  if (highMomentumParties.length > 0) {
    if (highMomentumParties.length === 1) {
      newsEvents.push(`${highMomentumParties[0]} gains momentum as their message resonates with voters.`);
    } else {
      newsEvents.push(`Multiple parties see rising support as the race intensifies.`);
    }
  }

  if (decliningParties.length > 0) {
    if (decliningParties.length === 1) {
      newsEvents.push(`${decliningParties[0]} faces challenges as support begins to waver.`);
    } else {
      newsEvents.push(`Several parties struggle to maintain voter confidence.`);
    }
  }

  return newsEvents;
}
const RANDOM_NEWS_EVENTS = [
  // General Politics
  "Leak: Ex-Finance Minister's Messages Show Secret Talks With {organisation} Lobbyists",
  "Infrastructure Bill Gains Surprise Support In Key {region} Seats",
  "Huge Youth Turnout In {city} Boosts Progressive Parties",
  "Electoral Commission Unveils Controversial Debate Format With Live AI Fact-Checking",
  "Environmental Bloc Fractured As {organisation} Endorses Rival Candidate",
  "Secret Talks Revealed: Three Minor Parties Plot 'Government Of National Unity'",
  "Campaign Finance Act Passes Key Hurdle Despite Fierce {industry} Lobbying",
  "Government Collapses By Single Vote; Snap Election Called In {city}",
  "High Court To Hear Legal Challenge To New Voter ID Laws",
  "{region} Farmers Form Protest Group Over New Agricultural Water Quotas",
  "Head Of State's Visit To {foreign_country} Met With Reparations Protests",
  "Anti-Corruption Prosecutor Charges Three Sitting MPs Linked To {industry}",
  "Proposal To Lower Voting Age To 16 Splits Ruling Coalition",
  "{historical_figure} Memorial Defaced In {city} Amid Ongoing Protests",
  "New Tax Breaks For The {industry} Sector Spark Outrage Among {region} Voters",
  "Bilateral Summit In {city}: Leaders To Discuss {foreign_country} Trade Tariffs",

  // Economy
  "{organisation} Shares Plummet 23% On Crypto Exposure Fears",
  "Job Gap Widens: Unemployment At 4.2% In {region}, 7.8% In Capital",
  "Business Confidence In {industry} Sector Hits 18-Month High",
  "{city} Home Prices Soar; Gov't Debates Foreign Buyer Tax",
  "Trade Talks With {foreign_country} Stall Over Disputed Fishing Rights",
  "Tech Jobs Grow 15% In {region}; Traditional Manufacturing Stagnates",
  "Inflation Spikes 0.9% In A Month As Port Strike Drives Up Energy Costs",
  "Diplomatic Row With {foreign_country} Triggers 20% Tariff On Farm Exports",
  "Rare Earth Discovery Sparks Economic Boom In {region}",
  "Tourism Revenue Hits 94% Of Pre-Pandemic Levels After World Expo Success",
  "Central Bank In Shock Move Raises Interest Rates 50 Bps To Fight Inflation",
  "Global Supply Chain Disruptions Hit {industry} Manufacturers In {city}",
  "{organisation} Announces Multi-Billion Dollar Investment In {region} Infrastructure",

  // Society & Culture
  "6-Hour ER Waits Make Healthcare Reform Top Election Issue",
  "25,000 Teachers March On {city} Demanding Better Pay",
  "National Debate Erupts Over Revising Textbooks On {historical_figure}",
  "Deepfake Videos Of Leaders Prompt Emergency Session On Election Misinformation",
  "Vandals Hit Historic {city} Temple; Leaders Urge Interfaith Dialogue",
  "{organisation} Wins Major Grant To Digitize Ancient {region} Dialects",
  "National Symphony Faces Closure From Funding Cuts; Public Rallies To Save It",
  "Musician's Endorsement Video Hits 15M Views, Sways Youth Polls",
  "Top {city} Football Star Arrested On Tax Evasion Charges",
  "Ancient Ruins Linked To {historical_figure} Halt {region} Dam Project",
  "Controversial New Biopic Of {historical_figure} Sweeps National Film Awards",
  "{city} Selected As Host For Next Year's Global {industry} Summit",

  // International & Geopolitics
  "Climate Summit Ends In Deadlock Over Carbon Credits And Developing Nation Aid",
  "Economic Collapse In {foreign_country} Sparks Sharp Rise In Border Smuggling",
  "Nationalist Parties Oppose Foreign Aid Budget, Cite Domestic Needs",
  "International Observers From 20 Nations Praise New Biometric Voter System",
  "State-Sponsored Cyberattack Causes Widespread Blackouts In {region}",
  "{organisation} Report On Human Rights Strains Ties With {foreign_country}",
  "Naval Vessel Rammed In Disputed Sea; Tensions Rise Over Fishing Waters",
  "Ambassador Recalled From {foreign_country} Amid Public Spying Accusations",
  "Joint Military Alliance Showcases New Drone And Hypersonic Tech In Wargames",
  "Student Exchange With 15-Nation Bloc Expands To Vocational Training",
  "Diplomatic Expulsions: {foreign_country} Retaliates After Embassy Dispute In {city}",
  "Joint Peacekeeping Mission Announced By {organisation} And Regional Allies",

  // Environment & Science
  "Typhoon Exposes Coastal Weaknesses In {region}; Gov't Response Criticized",
  "{city} Residents Protest Massive Solar Farm Approved By {organisation}",
  "Capital Faces Stage 4 Water Restrictions; Reservoirs At Record 28% Low",
  "New Protection Laws Spark Clash Between Conservationists And {industry}",
  "Mystery Bee Decline Threatens Multi-Billion Dollar Farm Sector",
  "Wildfire Smoke From {region} Triggers Air Quality Alerts In {city}",
  "Remote Volcano Erupts, Stranding Thousands And Disrupting Global Air Travel",
  "{organisation} Announces Joint Manned Mission To Mars With {foreign_country}",
  "Landmark AI Consciousness Study Retracted Over Fabricated Data Claims",
  "Cleanup Crews Remove 15 Tons Of Plastic From Major River Delta",
  "Breakthrough In Fusion Energy Reported By Researchers At {city} University",
  "Endangered Species Sighted In {region} For The First Time In A Century",

  // Technology & Random
  "{organisation} Proposes Mandatory Algorithm Audits For {industry} Sector",
  "Massive Cyber-Heist Drains Millions; National Banking System Halted",
  "Unexplained Atmospheric Event Creates Auroras Visible Across Entire {region}",
  "National 'Cheese Crisis' Looms As Bacterial Blight Hits 90% Of Dairy Herds",
  "Mystery Online Puzzle Captivates Millions In Global Collaboration",
  "Digital ID Rollout Paused After Cyberattack Attributed To {foreign_country}",
  "Pop Star Sparks Nationwide Shortage Of Traditional Folk Hats",
  "Beloved Giant Panda At {city} Zoo Gives Birth To Twins",
  "Shipwreck Discovered Off The Coast Of {region} Dates Back To {historical_figure}",
  "Thousands Of Migratory Birds Unexpectedly Descend On Capital City Park",
  "Self-Driving Taxi Fleet Grounded In {city} Following Minor Collision",
  "New Quantum Computer Unveiled By {organisation} Shatters Processing Records"
];

const ECONOMIC_CRISIS_EVENTS = [
  "Recession Fears Mount As {industry} Giant Closes 3 Plants In {region}",
  "Credit Crunch: {organisation} Halts Business Lending As Defaults Surge To 9.1%",
  "Chip Shortage Forces Indefinite Halt To Auto And Electronics Production",
  "Currency Plunges 15%; Skyrocketing Import Costs Hit Households",
  "Commercial Real Estate Values Collapse As {city} Office Towers Sit Empty",
  "SME Revenues Down 40% Amid Supply Chain And Energy Price Chaos",
  "Spending Cuts Loom For {region} As National Debt-To-GDP Hits 130%",
  "Central Bank Slashes Growth Forecast As {foreign_country} Trade Slows",
  "Bailout Talks Stall Between Finance Ministry And Struggling {industry} Sector",
  "Mass Layoffs Announced At Top {city} Tech Firms Amid Market Downturn",
  "Hyperinflation Looms: Basic Goods Tripling In Price Across {region}",
  "Pension Crisis Worsens As {organisation} Declares Bankruptcy"
];

const ECONOMIC_OPTIMISM_EVENTS = [
  "{organisation} To Build Mega-Plant In {region}, Creating 9,000 Jobs",
  "Boom Times: Unemployment Hits 50-Year Low At 2.9% Amid Labor Shortage",
  "{industry} Exports Surge 30% After Landmark Trade Deal With {foreign_country}",
  "AI Tools Boost Worker Output 18%, Sparking Wage Growth In Service Sector",
  "Consumer Confidence In {city} Soars To 20-Year High; Savings Rates Stabilize",
  "Banks Boost Small Business Lending 25%, Funding Thousands Of Projects",
  "Massive Infrastructure Plan Kicks Off Throughout {region}, Creating 50,000 Jobs",
  "Sustained 3.5% Growth Projected Following Major {industry} Breakthroughs",
  "Startup Hub In {city} Attracts Record Foreign Direct Investment",
  "Unprecedented Boom In {industry} Leads To Widespread Minimum Wage Hikes",
  "Trade Surplus Widens As Demand From {foreign_country} Reaches All-Time High",
  "Government Announces Sweeping Tax Cuts Endorsed By {organisation}"
];

const POLARIZATION_EVENTS = [
  "High Court Ruling Triggers Mass Protests Across {region}",
  "Controversial Act Sparks Public Feud Between {organisation} And Faith Leaders",
  "Immigration Raids Lead To Standoffs Between Police And {city} Officials",
  "Clashes At {city} University Over {historical_figure} Statue Force Evacuation",
  "Culture War Deepens Over Proposed Guidelines For {industry} Advertisers",
  "Calls For Constitutional Rewrite Deeply Divide {region} Voting Bloc",
  "Partisan Gridlock Leaves {city} Without Federal Funding For Third Month",
  "Controversial Diplomatic Mission To {foreign_country} Sparks Bipartisan Outrage",
  "Rival Protest Groups Clash Violently Outside {organisation} Headquarters",
  "Debate Over {historical_figure}'s Legacy Leads To Walkout In Parliament",
  "Proposed Education Bill Triggers Nationwide Strikes By {industry} Workers",
  "Dispute Over Border Checkpoints In {region} Leads To Constitutional Crisis"
];

export function applyVoterDynamics(data: number[][], pollIteration: number): string[] {
  const newsEvents: string[] = [];

  if (pollIteration === 1) {
    return newsEvents; // No changes for baseline poll
  }

  // Add random flavor news events (30% chance)
  if (Math.random() < 0.3) {
    const randomEvent = RANDOM_NEWS_EVENTS[Math.floor(Math.random() * RANDOM_NEWS_EVENTS.length)];
    newsEvents.push(randomEvent);
  }

  // Economic anxiety factor - affects economic issues more
  let economicAnxiety = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  let economicCrisis = false;
  if (Math.random() < 0.1) { // 10% chance of significant economic uncertainty
    economicAnxiety = 0.5 + Math.random() * 1.3; // 0.5 to 1.8
    economicCrisis = true;
    if (economicAnxiety > 1.4) {
      const crisisEvent = ECONOMIC_CRISIS_EVENTS[Math.floor(Math.random() * ECONOMIC_CRISIS_EVENTS.length)];
      newsEvents.push(crisisEvent);
    } else if (economicAnxiety < 0.7) {
      const optimismEvent = ECONOMIC_OPTIMISM_EVENTS[Math.floor(Math.random() * ECONOMIC_OPTIMISM_EVENTS.length)];
      newsEvents.push(optimismEvent);
    }
  }

  // Social polarization events
  const polarizationEvent = Math.random() < 0.08; // 8% chance
  const polarizationStrength = polarizationEvent ? 1.2 + Math.random() * 0.8 : 1.0; // 1.2 to 2.0

  if (polarizationEvent) {
    const polarizationNews = POLARIZATION_EVENTS[Math.floor(Math.random() * POLARIZATION_EVENTS.length)];
    newsEvents.push(polarizationNews);
  }

  // Apply small random changes to voter opinions
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    for (let i = 0; i < VALUES.length; i++) {
      if (Math.random() < 0.015) { // 1.5% chance per voter per issue
        const change = (Math.random() - 0.5) * 3; // Smaller change range
        const newValue = data[i][voterIndex] + change;
        data[i][voterIndex] = Math.max(-100, Math.min(100, newValue));
      }
    }
  }

  return newsEvents;
}

export interface BlocStatistics {
  blocId: string;
  blocName: string;
  size: number;
  weight: number;
  percentages: Record<string, number>; // party name -> percentage
  leadingParty: string;
  leadingPercentage: number;
  turnout: number; // actual turnout rate for this bloc (0-1)
  expectedVoters: number; // expected voters based on weight
  actualVoters: number; // actual voters who participated
}

export function conductPoll(
  data: number[][],
  candidates: Candidate[],
  pollIteration: number = 0,
  country?: Country
): { results: Array<{ candidate: Candidate; votes: number; percentage: number }>, newsEvents: string[], blocStats?: BlocStatistics[] } {
  // Reset results for this poll
  const pollResults: number[] = new Array(candidates.length).fill(0);
  let notVoted = 0;
  // Ensure loyalty memory exists for current electorate size
  ensureLastChoices(data[0]?.length || 0);

  // Apply political dynamics to parties
  const politicalNews = applyPoliticalDynamics(candidates, pollIteration);

  // Apply voter opinion evolution
  const voterNews = applyVoterDynamics(data, pollIteration);

  // Combine news events
  const allNewsEvents = [...politicalNews, ...voterNews];

  // Apply minimal polling noise to simulate margin of error
  const pollingNoise = 0.995 + Math.random() * 0.01; // 0.995 to 1.005

  // Bloc-level tallies (always calculate if blocs exist)
  const blocTallies: Record<string, number[]> = {};
  const blocSizes: Record<string, number> = {};
  const blocTotalVoters: Record<string, number> = {}; // Total voters in each bloc (voted + abstained)
  if (country?.blocs && VOTER_BLOC_IDS) {
    country.blocs.forEach(b => {
      blocTallies[b.id] = new Array(candidates.length).fill(0);
      blocSizes[b.id] = 0;
      blocTotalVoters[b.id] = 0;
    });
  }

  // Poll the entire electorate
  for (let voterIndex = 0; voterIndex < data[0].length; voterIndex++) {
    const choice = voteForCandidate(voterIndex, candidates, data, country);

    // Track bloc membership regardless of vote
    if (country?.blocs && VOTER_BLOC_IDS) {
      const blocId = VOTER_BLOC_IDS[voterIndex];
      if (blocId >= 0 && blocId < country.blocs.length) {
        const blocKey = country.blocs[blocId].id;
        blocTotalVoters[blocKey]++; // Count all voters in this bloc

        if (choice !== null) {
          blocTallies[blocKey][choice]++;
          blocSizes[blocKey]++; // Count only those who actually voted
        }
      }
    }

    if (choice !== null) {
      pollResults[choice]++;
      if (LAST_CHOICES) LAST_CHOICES[voterIndex] = choice;
    } else {
      notVoted++;
      if (LAST_CHOICES) LAST_CHOICES[voterIndex] = -1;
    }
  }

  // Apply minimal polling noise to results (only if there are votes)
  const totalRawVotes = pollResults.reduce((sum, votes) => sum + votes, 0);
  if (totalRawVotes > 0) {
    for (let i = 0; i < pollResults.length; i++) {
      pollResults[i] = Math.max(0, pollResults[i] * pollingNoise);
    }
  }

  // Calculate total votes and percentages
  const totalVotes = pollResults.reduce((sum, votes) => sum + votes, 0);

  // Return results as array of objects with percentages
  const results = candidates.map((candidate, index) => ({
    candidate,
    votes: Math.round(pollResults[index]), // Round to whole votes
    percentage: totalVotes > 0 ? (pollResults[index] / totalVotes) * 100 : 0
  }));

  // Ensure percentages add up to 100% (handle rounding errors)
  if (totalVotes > 0) {
    const totalPercentage = results.reduce((sum, result) => sum + result.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      // Find the candidate with the most votes and adjust their percentage
      const maxIndex = results.findIndex(r => r.votes === Math.max(...results.map(res => res.votes)));
      if (maxIndex !== -1) {
        results[maxIndex].percentage += (100 - totalPercentage);
      }
    }
  }

  // Calculate bloc statistics
  const blocStats: BlocStatistics[] = [];
  if (country?.blocs) {
    for (const bloc of country.blocs) {
      const tallies = blocTallies[bloc.id] || [];
      const actualVoters = blocSizes[bloc.id] || 0; // Voters who actually voted
      const totalBlocVoters = blocTotalVoters[bloc.id] || 1; // Total voters in bloc (voted + abstained)
      const expectedVoters = Math.round(data[0].length * bloc.weight); // Expected based on weight
      const turnout = totalBlocVoters > 0 ? actualVoters / totalBlocVoters : 0;

      if (totalBlocVoters > 0) {
        const percentages: Record<string, number> = {};
        let maxPct = 0;
        let leadingParty = '';

        candidates.forEach((c, i) => {
          // Calculate percentage of entire bloc (including non-voters)
          const pct = totalBlocVoters > 0 ? (tallies[i] / totalBlocVoters) * 100 : 0;
          percentages[c.party] = pct;
          if (pct > maxPct) {
            maxPct = pct;
            leadingParty = c.party;
          }
        });

        // Convert bloc ID to display name (e.g., "urban_progressives" -> "Urban Progressives")
        const blocName = bloc.id
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        blocStats.push({
          blocId: bloc.id,
          blocName,
          size: actualVoters,
          weight: bloc.weight,
          percentages,
          leadingParty,
          leadingPercentage: maxPct,
          turnout,
          expectedVoters,
          actualVoters
        });
      }
    }
  }

  // DEBUG: bloc-level shares (only when DEBUG)
  if (DEBUG && country?.blocs) {
    console.log('Bloc shares:');
    for (const stats of blocStats) {
      console.log(stats.blocId, stats.percentages);
    }
  }

  return { results, newsEvents: allNewsEvents, blocStats };
}

// Helper to initialize electorate once at game start
export function initElectorate(country: Country): number[][] {
  const data = generateVotingData(country);
  ensureLastChoices(data[0]?.length || 0);
  return data;
}

export function formatVotes(votes: number, scaleFactor: number): string {
  const formattedVotes = Math.abs(votes * scaleFactor + (Math.random() * 1000));
  return Math.round(formattedVotes).toLocaleString();
}

export function applyEventEffect(
  playerCandidate: Candidate,
  effect: Partial<PoliticalValues>,
  boost: number,
  countryData: Country
): { pollingChange: number; newsEvents: string[] } {
  const newsEvents: string[] = [];

  // Calculate polling impact BEFORE applying the changes
  let voterAlignment = 0;

  if (DEBUG) {
    console.log(`DEBUG: Calculating voter alignment for effects: ${JSON.stringify(effect)}`);
  }

  const voterPreferenceAnalysis: string[] = [];

  // Convert voter alignment to polling change
  const baseChange = voterAlignment / 30.0;
  let pollingChange = baseChange * Math.min(boost / 12.0, 1.5);

  // Add moderate randomness for event uncertainty
  const randomFactor = (Math.random() - 0.5) * 2; // -1.0 to 1.0
  pollingChange += randomFactor;

  // Simplified minimum effect logic
  if (Math.abs(pollingChange) < 0.5) {
    const sign = boost >= 0 ? 1 : -1;
    const minimumEffect = sign * Math.abs(boost) / 30.0;
    pollingChange = minimumEffect;
  }

  // Cap maximum polling change
  pollingChange = Math.max(-5.0, Math.min(5.0, pollingChange));

  // Apply polling change with proper bounds checking
  const oldPopularity = playerCandidate.party_pop;
  playerCandidate.party_pop += pollingChange;

  // Ensure party popularity stays within reasonable bounds
  if (playerCandidate.party_pop > 100) {
    playerCandidate.party_pop = 100;
  } else if (playerCandidate.party_pop < -50) {
    playerCandidate.party_pop = -50;
  }

  for (const [valueKey, change] of Object.entries(effect)) {
    if (valueKey in countryData.vals && change !== undefined) {
      const voterPosition = countryData.vals[valueKey as keyof PoliticalValues];

      // Find player's CURRENT position on this issue
      const valueIndex = VALUES.indexOf(valueKey as any);
      if (valueIndex !== -1) {
        const playerOldPosition = playerCandidate.vals[valueIndex];
        const playerNewPosition = Math.max(-100, Math.min(100, playerOldPosition + change));

        // Calculate how much closer/further this moves player to voter center
        const distanceBefore = Math.abs(voterPosition - playerOldPosition);
        const distanceAfter = Math.abs(voterPosition - playerNewPosition);
        const alignmentChange = distanceBefore - distanceAfter;
        voterAlignment += alignmentChange;

        if (DEBUG) {
          console.log(`DEBUG: ${valueKey}: voter=${voterPosition}, old=${playerOldPosition}, new=${playerNewPosition}`);
          console.log(`DEBUG: distance_before=${distanceBefore}, distance_after=${distanceAfter}, alignment_change=${alignmentChange}`);
        }



        // Analyze voter preference trends for news
        if (Math.abs(change) >= 5 && Math.random() < 0.8) { // this is an absolute number from -100 to 100 of the change of the corresponding value
          if (alignmentChange > 0) { // Moving closer to voter preference
            const nameChoice = Math.random() > 0.5 ? playerCandidate.party : playerCandidate.name;
            switch (valueKey) {
              case "soc_cap":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Pro-Business Stance Boosts Voter Confidence`,
                    `Voters Applaud ${nameChoice}'s Economic Growth Agenda`,
                    `${nameChoice} Declares: 'Let the Market Decide!'`,
                    `Wall Street Cheers as ${nameChoice} Slashes Red Tape`,
                    `Big Business Backs ${nameChoice}—But What About Workers?`,
                    `Critics Warn: ${nameChoice}'s Tax Cuts Only Help the Top 1%`,
                    `${nameChoice} Touts 'Trickle-Down'—Skeptics See Empty Promises`,
                    `Small Businesses Left Behind in ${nameChoice}'s Corporate Bonanza`,
                    `Stock Market Soars, Wages Stagnate Under ${nameChoice}'s Watch`,
                    `${nameChoice} Rolls Out Red Carpet for Billionaires`,
                    `Main Street or Wall Street? ${nameChoice} Makes Their Choice Clear`,
                    `Analysts: ${nameChoice}'s Deregulation a Gift to Polluters and Profiteers`,
                    `Workers Demand Fair Share as ${nameChoice} Celebrates CEO Bonuses`,
                    `Is ${nameChoice} Building Prosperity or Just Profits?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Social Spending Push Resonates with Voters`,
                    `Public Backs ${nameChoice}'s Vision for a Fairer Society`,
                    `${nameChoice} Promises 'Healthcare for All'—Crowds Erupt in Cheers`,
                    `Universal Childcare Plan from ${nameChoice} Draws Widespread Support`,
                    `'No One Left Behind': ${nameChoice} Unveils Ambitious Welfare Expansion`,
                    `Critics Call ${nameChoice}'s Tax-the-Rich Plan a 'Bold Step for Justice'`,
                    `Voters Rally as ${nameChoice} Pledges to End Poverty Wages`,
                    `${nameChoice} Champions Free College—Youth Turn Out in Record Numbers`,
                    `Big Pharma on Notice as ${nameChoice} Demands Drug Price Controls`,
                    `'People Over Profits': ${nameChoice} Doubles Down on Social Safety Net`,
                    `Analysts: ${nameChoice}'s Redistribution Plan Could Reshape the Economy`,
                    `Opponents Warn of 'Runaway Spending' as ${nameChoice} Pushes New Benefits`,
                    `Support Surges for ${nameChoice}'s Promise of Affordable Housing for All`,
                    `Is ${nameChoice} Sparking a New Era of Economic Fairness?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "prog_cons":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `Voters Rally Around ${nameChoice}'s Traditional Values Platform`,
                    `${nameChoice}'s 'Moral Foundation' Message Strikes a Chord`,
                    `${nameChoice} Promises to Restore 'Family First' Principles`,
                    `Support Surges for ${nameChoice}'s Stand Against 'Cultural Decay'`,
                    `${nameChoice} Champions 'Back to Basics' in Schools and Society`,
                    `'Common Sense Values' Drive ${nameChoice}'s Campaign Momentum`,
                    `Faith Leaders Praise ${nameChoice}'s Commitment to Tradition`,
                    `${nameChoice} Vows to Defend Heritage Against 'Radical Change'`,
                    `Polls Show Growing Trust in ${nameChoice}'s Conservative Vision`,
                    `${nameChoice} Taps Into Nostalgia for 'Better Times'`,
                    `Critics Call ${nameChoice} Outdated - Voters Call It 'Real Leadership'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Progressive Reforms Lauded as 'Forward-Thinking'`,
                    `Voters Embrace ${nameChoice}'s Push for an Inclusive Society`,
                    `${nameChoice} Champions Equality—Minority Groups Rally in Support`,
                    `Bold Social Change: ${nameChoice} Pledges to Expand Civil Rights`,
                    `Youth Turn Out in Record Numbers for ${nameChoice}'s Progressive Vision`,
                    `Critics Call ${nameChoice}'s Reforms 'Radical'—Supporters Say 'Long Overdue'`,
                    `${nameChoice} Pushes for Gender Parity in Government and Business`,
                    `Universal Basic Income Plan from ${nameChoice} Ignites National Debate`,
                    `LGBTQ+ Advocates Applaud ${nameChoice}'s Commitment to Inclusion`,
                    `Analysts: ${nameChoice}'s Social Agenda Could Redefine the Nation`,
                    `Opponents Warn of 'Culture Shock' as ${nameChoice} Drives Rapid Change`,
                    `Support Surges for ${nameChoice}'s Promise of Justice for All`,
                    `Is ${nameChoice} Ushering in a New Era of Social Progress?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "env_eco":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Green Policies Hailed as Key to Sustainable Future`,
                    `Voters Support ${nameChoice}'s Strong Stance on Environment`,
                    `${nameChoice} Leads Charge for a Carbon-Free Economy`,
                    `Climate Action Plan from ${nameChoice} Wins Over Young Voters`,
                    `Scientists Applaud ${nameChoice}'s Ambitious Emissions Targets`,
                    `${nameChoice} Pledges to End Fossil Fuel Subsidies—Industry on Edge`,
                    `Green Jobs Boom Expected Under ${nameChoice}'s Leadership`,
                    `Environmental Groups Rally Behind ${nameChoice}'s Clean Energy Push`,
                    `Polls Show Surging Support for ${nameChoice}'s Climate Agenda`,
                    `${nameChoice} Declares: 'The Future Is Renewable'`,
                    `Critics Call ${nameChoice}'s Eco-Policies 'Bold and Necessary'`,
                    `Wildlife Advocates Praise ${nameChoice}'s Conservation Commitments`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Pro-Development Focus Promises Prosperity`,
                    `Economic Development a Winning Issue for ${nameChoice}, Say Voters`,
                    `${nameChoice} Champions Jobs Over 'Green Red Tape'`,
                    `Industry Leaders Praise ${nameChoice}'s Growth-First Agenda`,
                    `${nameChoice} Pledges to Unleash Economic Potential—Environmentalists Worry`,
                    `Voters Back ${nameChoice}'s Push for New Infrastructure and Industry`,
                    `Critics Say ${nameChoice}'s Policies Put Economy Ahead of Ecology`,
                    `Boom Times Predicted Under ${nameChoice}'s Development Drive`,
                    `${nameChoice} Declares: 'It's Time to Build, Not Block'`,
                    `Support Surges for ${nameChoice}'s Promise of Prosperity Through Progress`,
                    `Environmental Rules Rolled Back as ${nameChoice} Prioritizes Growth`,
                    `Analysts: ${nameChoice}'s Pro-Business Stance Could Spark Economic Revival`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "nat_glob":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `'Nation-First' Agenda from ${nameChoice} Gains Traction`,
                    `Voters Back ${nameChoice}'s 'Domestic First' Approach`,
                    `${nameChoice} Promises to Put Country Above All Else`,
                    `Borders, Jobs, and Pride: ${nameChoice}'s Nationalist Message Resounds`,
                    `${nameChoice} Declares: 'No More Outsourcing Our Future!'`,
                    `Patriotic Surge as ${nameChoice} Champions Local Industry`,
                    `Voters Rally Behind ${nameChoice}'s Call to Protect National Identity`,
                    `${nameChoice} Pledges to Defend Borders and Traditions`,
                    `Critics Say ${nameChoice}'s Nationalism Is 'What the Country Needs'`,
                    `Polls Show Growing Support for ${nameChoice}'s Sovereignty Agenda`,
                    `${nameChoice} Touts 'Homegrown Solutions for Homegrown Problems'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Global Cooperation Stance Seen as Essential`,
                    `Support Grows for ${nameChoice}'s Internationalist Vision`,
                    `${nameChoice} Champions Open Borders and Shared Prosperity`,
                    `Allies Praise ${nameChoice}'s Commitment to Global Partnerships`,
                    `${nameChoice} Pushes for Stronger International Institutions`,
                    `Voters Back ${nameChoice}'s Embrace of Multilateral Solutions`,
                    `Analysts: ${nameChoice}'s Diplomacy Strengthens National Influence Abroad`,
                    `${nameChoice} Declares: 'We Succeed Together, Not Alone'`,
                    `Global Markets Respond Positively to ${nameChoice}'s Outreach`,
                    `Support Surges for ${nameChoice}'s Vision of a Connected World`,
                    `${nameChoice}'s Globalism 'Bold and Necessary for the Future'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "pac_mil":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `Voters Back ${nameChoice}'s Call for Stronger National Defense`,
                    `Public Support Grows for ${nameChoice}'s Military Readiness Push`,
                    `${nameChoice} Pledges to Rebuild Armed Forces—Voters Approve`,
                    `National Security Tops Agenda as ${nameChoice} Calls for More Defense Spending`,
                    `Polls Show Rising Trust in ${nameChoice}'s Tough Stance on Security`,
                    `${nameChoice} Declares: 'Peace Through Strength'`,
                    `Military Leaders Endorse ${nameChoice}'s Commitment to Readiness`,
                    `Voters Rally Behind ${nameChoice}'s Promise to Protect the Nation`,
                    `Critics Call ${nameChoice}'s Defense Plan 'Bold and Necessary'`,
                    `Support Surges for ${nameChoice}'s Push to Modernize the Military`,
                    `${nameChoice} Warns: 'We Must Be Prepared for Any Threat'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `Peace-First Policy by ${nameChoice} Earns Widespread Praise`,
                    `Voters See ${nameChoice}'s Diplomacy Push as Path to Stability`,
                    `${nameChoice} Says: 'Talk, Not Tanks'—Public Cheers`,
                    `Diplomacy Wins: ${nameChoice} Brokers Historic Ceasefire`,
                    `'Make Peace, Not War': ${nameChoice}'s Slogan Goes Viral`,
                    `Critics Call ${nameChoice} 'Soft'—Voters Call It 'Smart'`,
                    `Rivals Mock ${nameChoice}'s Pacifism, But Polls Tell a Different Story`,
                    `Peace Dividend? ${nameChoice} Promises to Reinvest Military Savings`,
                    `'No More Endless Wars': ${nameChoice} Draws Applause at Rally`,
                    `${nameChoice} MP Hugs Foreign Leader, Internet Explodes`,
                    `${nameChoice}'s Diplomacy Could Redefine National Security`,
                    `'Doves Over Hawks': ${nameChoice}'s Approach Gains Momentum`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "auth_ana":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Law-and-Order Platform Resonates in Polls`,
                    `Public Backs ${nameChoice}'s Pledge for Safer Communities`,
                    `${nameChoice} Promises Crackdown on Crime—Voters Cheer`,
                    `'Zero Tolerance': ${nameChoice}'s Tough Stance Wins Support`,
                    `Polls Surge as ${nameChoice} Vows to Restore Order`,
                    `Curfews and Patrols: ${nameChoice}'s Security Plan Gains Traction`,
                    `${nameChoice} Declares 'Enough Is Enough!'—Demands Action Now`,
                    `Analysts: ${nameChoice}'s Authoritarian Approach Strikes a Nerve`,
                    `Opponents Warn of 'Police State' as ${nameChoice} Pushes New Laws`,
                    `Supporters Say ${nameChoice} Is 'The Only One Who Can Keep Us Safe'`,
                    `Public Divided: Is ${nameChoice} Protecting Freedom or Crushing It?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `'Individual Freedom' a Rallying Cry for ${nameChoice}'s Supporters`,
                    `${nameChoice}'s Libertarian Stance Energizes Voter Base`,
                    `${nameChoice} Promises to Cut Red Tape and Expand Personal Freedoms`,
                    `Voters Cheer ${nameChoice}'s Stand Against Government Overreach`,
                    `'Live and Let Live': ${nameChoice}'s Message Goes Viral`,
                    `Entrepreneurs Back ${nameChoice}'s Deregulation Drive`,
                    `Polls Surge as ${nameChoice} Champions Civil Liberties`,
                    `${nameChoice} Declares: 'Your Life, Your Choices'`,
                    `Analysts: ${nameChoice}'s Freedom Agenda Strikes a Chord with Youth`,
                    `Support Swells for ${nameChoice}'s Push to End Surveillance State`,
                    `${nameChoice} Says 'Let the People Decide!'—Crowds Roar Approval`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "rel_sec":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Emphasis on Faith and Values Connects with Voters`,
                    `Voters Applaud ${nameChoice}'s Focus on a Moral Compass`,
                    `${nameChoice} Pledges to Restore Faith to the Heart of Politics`,
                    `'Guided by God': ${nameChoice}'s Message Sparks National Conversation`,
                    `Faith Leaders Endorse ${nameChoice}'s Moral Vision`,
                    `${nameChoice}'s MP Spotted at Sunrise Prayer—Supporters Rejoice`,
                    `Voters Flock to ${nameChoice}'s 'Family and Faith' Rallies`,
                    `${nameChoice} Declares: 'A Nation Under God Is a Nation United'`,
                    `Polls Surge as ${nameChoice} Champions Religious Traditions`,
                    `Critics Call ${nameChoice} 'Principled'`,
                    `Sunday Sermons Echo ${nameChoice}'s Call for a Moral Revival`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `Support for Secular Governance Grows with ${nameChoice}'s Policies`,
                    `${nameChoice}'s Inclusive Stance Wins Favor with Secular Voters`,
                    `${nameChoice} Champions Separation of Church and State—Voters Approve`,
                    `Faith and Politics: ${nameChoice} Draws Line in the Sand`,
                    `Polls Surge as ${nameChoice} Defends Secular Traditions`,
                    `${nameChoice} MP Skips Prayer, Sparks Debate`,
                    `Analysts: ${nameChoice}'s Secular Push Resonates with Modern Electorate`,
                    `Voters Praise ${nameChoice} for Keeping Religion Out of Policy`,
                    `Critics Call ${nameChoice} 'Godless'`,
                    `${nameChoice} Declares: 'Government for All, Not Just the Faithful'`,
                    `Secular Groups Rally Behind ${nameChoice}'s Vision for Inclusive Governance`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              // Add more cases as needed
            }
          }
          else { // If alignment change is negative, away from the voters
            const nameChoice = Math.random() > 0.5 ? playerCandidate.party : playerCandidate.name;
            switch (valueKey) {
              case "soc_cap":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice} Under Fire for Being 'Too Pro-Business'`,
                    `Voters Say ${nameChoice} Favors Big Business Over Workers`,
                    `Critics Slam ${nameChoice} for Ignoring Working Families`,
                    `'Corporate Puppet?' Accusations Fly at ${nameChoice}`,
                    `The People Are Left Behind by ${nameChoice}'s Boardroom Buddies`,
                    `Protests Erupt Over ${nameChoice}'s Tax Breaks for Billionaires`,
                    `Workers Demand Answers as ${nameChoice} Courts Wall Street`,
                    `${nameChoice} MP Spotted at Gala with Top CEOs—Voters Outraged`,
                    `Poll: Majority Believe ${nameChoice} Puts Profits Before People`,
                    `Small Businesses Cry Foul Over ${nameChoice}'s Corporate Giveaways`,
                    `Is ${nameChoice} Governing for the People, or Just the Powerful?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Spending Plans Raise Economic Red Flags`,
                    `Critics Blast ${nameChoice}'s Spending Push as 'Reckless'`,
                    `Economists Warn: ${nameChoice}'s Promises Could Bankrupt the Nation`,
                    `'Tax-and-Spend' Label Sticks as ${nameChoice} Unveils New Welfare Schemes`,
                    `Voters Fear Soaring Debt Under ${nameChoice}'s Social Agenda`,
                    `Business Leaders Slam ${nameChoice}'s 'Unrealistic' Redistribution Plans`,
                    `${nameChoice} Wants to Give Away Your Paycheck`,
                    `Critics Say ${nameChoice} Is 'Buying Votes' with Costly Giveaways`,
                    `Poll: Majority Doubt ${nameChoice}'s Plans Are Sustainable`,
                    `Opponents Warn of 'Runaway Spending' and Economic Meltdown`,
                    `Is ${nameChoice} Turning the Country Into a Nanny State?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "prog_cons":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Traditional Values Message Seen as 'Out of Touch'`,
                    `Voters Skeptical of ${nameChoice}'s Conservative Pivot`,
                    `Critics Say ${nameChoice} Wants to Turn Back the Clock`,
                    `Young Voters Reject ${nameChoice}'s 'Old-Fashioned' Agenda`,
                    `${nameChoice} Calls for Return to 'The Good Old Days'—Backlash Ensues`,
                    `Analysts Warn: ${nameChoice}'s Platform Alienates Modern Families`,
                    `Protests Erupt Over ${nameChoice}'s Push for 'Traditional Morality'`,
                    `Is ${nameChoice} Out of Step with Today's Society?`,
                    `Opponents Accuse ${nameChoice} of Ignoring Social Progress`,
                    `Poll: Majority See ${nameChoice}'s Values as 'Outdated'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `Backlash Grows Against ${nameChoice}'s Progressive Reforms`,
                    `${nameChoice} Accused of Pushing 'Too Much, Too Fast'`,
                    `Critics Say ${nameChoice} Is Out of Touch With Everyday Concerns`,
                    `Voters Worry About 'Radical' Social Experiments by ${nameChoice}`,
                    `${nameChoice}'s Reforms Spark Culture War in Parliament`,
                    `Traditional Groups Protest ${nameChoice}'s 'Extreme' Social Agenda`,
                    `Poll: Majority Say ${nameChoice} Is Moving Society Too Quickly`,
                    `Opponents Warn of 'Unintended Consequences' from ${nameChoice}'s Policies`,
                    `Is ${nameChoice} Dividing the Nation With Progressive Overreach?`,
                    `Backlash as ${nameChoice} Pushes for Sweeping Social Change`,
                    `${nameChoice}'s Agenda Risks Alienating Moderate Voters`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "env_eco":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s Green Agenda Slammed as 'Job-Killer'`,
                    `${nameChoice}'s Eco-Policies Will Harm Economy`,
                    `${nameChoice} Threatens Thousands of Jobs`,
                    `${nameChoice}'s Climate Plan 'A Disaster for Workers'`,
                    `Voters Will Face Higher Bills Under ${nameChoice}`,
                    `Industry Groups Blast ${nameChoice} for 'Choking Growth'`,
                    `Strikes Erupt Over ${nameChoice}'s Fossil Fuel Crackdown`,
                    `${nameChoice}'s Eco-Policies Could Trigger Recession`,
                    `Is ${nameChoice} Putting the Planet Before People?`,
                    `Critics Claim ${nameChoice}'s Agenda Will 'Send Industry Overseas'`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice} Criticized for Prioritizing Economy Over Environment`,
                    `Environmental Groups Denounce ${nameChoice}'s 'Development-First' Stance`,
                    `Protests Erupt Over ${nameChoice}'s Rollback of Green Regulations`,
                    `${nameChoice} Labeled 'Enemy of the Environment' by Activists`,
                    `${nameChoice}'s Policies Threaten Climate Goals`,
                    `${nameChoice} Sides with Big Industry Over Nature`,
                    `${nameChoice} - 'Mortgaging the Future for Short-Term Gains'`,
                    `Wildlife Groups Slam ${nameChoice}'s Push for More Drilling and Mining`,
                    `Is ${nameChoice} Sacrificing Clean Air and Water for Economic Growth?`,
                    `${nameChoice}'s Agenda Could Trigger Ecological Crisis`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "nat_glob":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice}'s 'Nation-First' Rhetoric Sparks Isolationism Fears`,
                    `Critics Warn ${nameChoice}'s Nationalism Risks Global Standing`,
                    `${nameChoice} Pushes Racist Agenda`,
                    `${nameChoice} Is The New Face of Nationalism`,
                    `International Allies Alarmed by ${nameChoice}'s Hardline Borders`,
                    `Protests Erupt Over ${nameChoice}'s Anti-Immigrant Policies`,
                    `${nameChoice}'s Nationalism Could Trigger Trade Wars`,
                    `${nameChoice} Pushes Divisive Agenda, Critics Say`,
                    `Diplomats Warn ${nameChoice} Risks Turning Country Into a Pariah`,
                    `Minority Groups Fear Marginalization Under ${nameChoice}`,
                    `Is ${nameChoice} Fueling Division for Political Gain?`,
                    `Is ${nameChoice} The New Mussolini?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice} Attacked for 'Globalist' Agenda, Undermining Sovereignty`,
                    `Voters Fear ${nameChoice} Puts Global Interests Before National Ones`,
                    `Vote ${nameChoice} To Destroy Our Country`,
                    `${nameChoice} Will Rip Up Our Patriotism`,
                    `Vote ${nameChoice} To Destroy Our Country`,
                    `Critics Slam ${nameChoice} for Siding with Foreign Powers`,
                    `${nameChoice} Wants Open Borders, Say Opponents`,
                    `National Identity at Risk Under ${nameChoice}'s Global Vision`,
                    `Protests Erupt Over ${nameChoice}'s International Concessions`,
                    `Analysts Warn: ${nameChoice} Could Weaken National Security`,
                    `Is ${nameChoice} Selling Out Our Country?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "pac_mil":
                if (voterPosition < playerOldPosition) {
                  const votPrefNews = [
                    `Critics Label ${nameChoice}'s Defense Stance as 'Warmongering'`,
                    `${nameChoice} Warmongers At Inter-Nation Conference`,
                    `Fears of Conflict Escalate Over ${nameChoice}'s Hawkish Tone`,
                    `${nameChoice} - New Military Industrial Complex`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Peace Advocacy Slammed as 'Naive' and 'Weak'`,
                    `National Security Concerns Rise Over ${nameChoice}'s Pacifist Stance`,
                    `${nameChoice} Branded Peace Hippies`,
                    `Let's Bow Down To Our Enemies, Says ${nameChoice}`,
                    `${nameChoice} Pushes Disarmament`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "auth_ana":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `Civil Liberties Fears Mount Over ${nameChoice}'s Platform`,
                    `Crackdown Now, Says ${nameChoice}`,
                    `${nameChoice} Accused of 'Authoritarian Creep'`,
                    `${nameChoice} Wants A Police State`,
                    `Ban Protests, Says MP of ${nameChoice}`,
                    `${nameChoice} Plots Curfew for Dissenters`,
                    `Opponents Warn: ${nameChoice} Would Silence Critics`,
                    `Analysts Say ${nameChoice}'s Agenda Threatens Democracy`,
                    `Protests Erupt Over ${nameChoice}'s 'Iron Fist' Policies`,
                    `Is ${nameChoice} Turning the Country Into a Surveillance State?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `Think Tank: ${nameChoice}'s Libertarian Push Is 'Recipe for Chaos'`,
                    `Is ${nameChoice}'s 'Freedom' Agenda Practical?`,
                    `Want Chaos? Vote For ${nameChoice}`,
                    `Vote For ${nameChoice} To Increase Crime`,
                    `Critics Warn: ${nameChoice}'s Deregulation Means No Rules, No Order`,
                    `${nameChoice}'s 'Hands-Off' Approach Sparks Safety Fears`,
                    `Analysts Say ${nameChoice}'s Libertarianism Could Gut Public Services`,
                    `Voters Fear ${nameChoice} Would Let Corporations Run Wild`,
                    `Is ${nameChoice} Putting Ideology Before Public Safety?`,
                    `Opponents Claim ${nameChoice} Would Turn Society Into a Free-For-All`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              case "rel_sec":
                if (voterPosition > playerOldPosition) {
                  const votPrefNews = [
                    `${nameChoice} Faces Backlash for Blurring Line Between Church and State`,
                    `Critics: ${nameChoice}'s Religious Focus Alienates Voters`,
                    `${nameChoice} Blasted for Taking Donations from Church`,
                    `Concerns Rise Over ${nameChoice}'s Plans to Fund Religious Schools`,
                    `Debate Erupts as ${nameChoice} Calls for Prayer in Public Institutions`,
                    `Opponents Warn: ${nameChoice}'s Agenda Threatens Religious Freedom for All`,
                    `Poll: Majority Oppose ${nameChoice}'s Efforts to Expand Religious Influence`,
                    `Legal Experts Question Constitutionality of ${nameChoice}'s Faith Initiatives`,
                    `Minority Faith Leaders Say ${nameChoice} Marginalizes Non-Majority Religions`,
                    `Backlash Grows as ${nameChoice} Links Policy to Religious Doctrine`,
                    `Civil Rights Groups Slam ${nameChoice} for Undermining Secular Traditions`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                } else {
                  const votPrefNews = [
                    `${nameChoice}'s Secular Stance Sparks Outcry from Religious Groups`,
                    `Faith Communities Feel 'Sidelined' by ${nameChoice}'s Policies`,
                    `Archbishop: Support for ${nameChoice} blasphemous`,
                    `${nameChoice} Accused of 'Waging War on Faith'`,
                    `Religious Leaders Condemn ${nameChoice}'s Push for Secular Laws`,
                    `Protests Erupt Over ${nameChoice}'s Removal of Religious Symbols`,
                    `Critics Say ${nameChoice} Is 'Erasing Tradition for Modernity'`,
                    `Faith Groups Warn: ${nameChoice}'s Agenda Threatens Religious Freedom`,
                    `Voters Divided as ${nameChoice} Champions Church-State Separation`,
                    `Is ${nameChoice} Alienating Believers for Political Gain?`
                  ];
                  voterPreferenceAnalysis.push(votPrefNews[Math.floor(Math.random() * votPrefNews.length)]);
                }
                break;
              // Add more cases as needed
            }
          }
        }
      }
    }
  }

  // NOW apply the changes to the candidate
  for (let i = 0; i < VALUES.length; i++) {
    const valueKey = VALUES[i];
    if (valueKey in effect && effect[valueKey] !== undefined) {
      const oldVal = playerCandidate.vals[i] * EVENT_EFFECT_MULTIPLIER; // make half as big
      playerCandidate.vals[i] += effect[valueKey]! * EVENT_EFFECT_MULTIPLIER;
      // Clamp values to valid range
      playerCandidate.vals[i] = Math.max(-100, Math.min(100, playerCandidate.vals[i]));

      if (DEBUG) {
        console.log(`DEBUG: Changed ${valueKey} from ${oldVal} to ${playerCandidate.vals[i]}`);
      }
    }
  }


  // Generate news based on voter preference analysis
  if (voterPreferenceAnalysis.length > 0) {
    newsEvents.push(...voterPreferenceAnalysis.slice(0, 2)); // Max 2 items
  }


  if (DEBUG) {
    console.log(`DEBUG: Voter alignment: ${voterAlignment.toFixed(2)}, Boost: ${boost}`);
    console.log(`DEBUG: Final polling change: ${pollingChange.toFixed(2)}`);
    console.log(`DEBUG: Party popularity changed from ${oldPopularity.toFixed(2)} to ${playerCandidate.party_pop.toFixed(2)}`);
  }

  return { pollingChange, newsEvents };
}
