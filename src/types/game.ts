export interface PoliticalValues {
  prog_cons: number;     // Progressive(-) to Conservative(+)
  nat_glob: number;      // Nationalist(-) to Globalist(+)
  env_eco: number;       // Environmental(-) to Economic(+)
  soc_cap: number;       // Socialist(-) to Capitalist(+)
  pac_mil: number;       // Pacifist(-) to Militaristic(+)
  auth_ana: number;      // Authoritarian(-) to Anarchist(+)
  rel_sec: number;       // Religious(-) to Secular(+)
}

export interface TrendDefinition {
  id: string;
  title: string;
  description: string;
  valueKey: PoliticalValueKey;
  direction: 1 | -1;
  directionLabel: string;
  axisLabel: string;
  shiftRange: [number, number];
  durationRange: [number, number];
  startTemplates: string[];
  ongoingTemplates: string[];
  completionTemplates: string[];
}

export interface ActiveTrend extends TrendDefinition {
  totalShift: number;
  weeklyShift: number;
  duration: number;
  remainingWeeks: number;
  appliedShift: number;
  startWeek: number;
  endWeek: number;
}

export interface Candidate {
  id: number;
  name: string;
  party: string;
  party_pop: number;
  vals: number[];
  colour: string;
  swing?: number;
  is_player: boolean;
  momentum?: number;
  previous_popularity?: number;
}

export interface Country {
  pop: number;
  vals: PoliticalValues;
  scale: number;
  hos: string;
}

export interface Event {
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventChoice {
  text: string;
  effect: Partial<PoliticalValues>;
  boost: number;
}

export interface PollResult {
  candidate: Candidate;
  votes: number;
  percentage: number;
  change?: number;
}

export interface PollingSnapshot {
  week: number;
  percentages: Record<string, number>;
}

export interface GameState {
  country: string;
  countryData: Country;
  partyList: string;
  candidates: Candidate[];
  playerCandidate: Candidate | null;
  currentPoll: number;
  totalPolls: number;
  pollResults: PollResult[];
  previousPollResults: Record<string, number>;
  initialPollResults: Record<string, number>;
  politicalNews: string[];
  playerEventNews: string[];
  votingData: number[][];
  pendingParties?: any[];
  coalitionState?: CoalitionState;
  phase: 'setup' | 'party-selection' | 'partyMerging' | 'player-selection' | 'campaign' | 'results' | 'coalition';
  pollingHistory: PollingSnapshot[];
  activeTrend: ActiveTrend | null;
  trendHistory: ActiveTrend[];
  nextTrendPoll: number | null;
}

export interface CoalitionState {
  coalitionPartners: Candidate[];
  currentCoalitionPercentage: number;
  availablePartners: Candidate[];
  cabinetAllocations: Record<string, string[]>;
  isPlayerLead: boolean;
  negotiationPhase: 'partner-selection' | 'cabinet-negotiation' | 'complete';
  currentNegotiatingPartner?: Candidate;
}

export interface CabinetPosition {
  importance: number;
  max_slots: number;
  description: string;
}

export const VALUES = [
  "prog_cons",
  "nat_glob", 
  "env_eco",
  "soc_cap",
  "pac_mil",
  "auth_ana",
  "rel_sec"
] as const;

export const CABINET_POSITIONS: Record<string, CabinetPosition> = {
  "Deputy Prime Minister": { importance: 35, max_slots: 1, description: "Second-in-command of the government" },
  "Finance Minister": { importance: 28, max_slots: 1, description: "Controls economic policy and budget" },
  "Foreign Minister": { importance: 27, max_slots: 1, description: "Leads international relations and diplomacy" },
  "Defence Minister": { importance: 20, max_slots: 1, description: "Oversees military and national security" },
  "Interior Minister": { importance: 20, max_slots: 1, description: "Manages domestic security and law enforcement" },
  "Health Minister": { importance: 10, max_slots: 1, description: "Oversees healthcare system and public health" },
  "Education Minister": { importance: 10, max_slots: 1, description: "Manages education policy and schools" },
  "Environment Minister": { importance: 10, max_slots: 1, description: "Handles environmental policy and climate action" },
  "Justice Minister": { importance: 10, max_slots: 1, description: "Oversees legal system and courts" },
  "Transport Minister": { importance: 10, max_slots: 1, description: "Manages transportation infrastructure" },
  "Junior Ministers": { importance: 5, max_slots: 8, description: "Supporting ministerial roles" },
};

// Game configuration constants
export const DEBUG = false;
export const TOO_FAR_DISTANCE = 190;
export const COALITION_FACTOR = 1.1;
export const TOO_CLOSE_PARTY = 100;
export const VOTE_MANDATE = false;
export const POLL_COUNTER = 30;

export type PoliticalValueKey = keyof PoliticalValues;
